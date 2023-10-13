import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumberish, Contract, Signer } from "ethers";
import {
    Flash,
    Flash__factory,
    IERC20Complete,
    IERC20Complete__factory,
} from "../typechain-types";

import { setBalance }  from "@nomicfoundation/hardhat-network-helpers";

export async function impersonateAccount(address: string) {
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address],
    });
    return ethers.provider.getSigner(address);
}

describe("Flash", function () {
    let flash: Flash;
    const usdcAddress = "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83";
    const usdcWhale = "0xba12222222228d8ba445958a75a0704d566bf2c8";
    let usdc: IERC20Complete;
    let signer: Signer;
    let receiver: Signer;
    before(async function () {
        const signers = await ethers.getSigners();
        console.log("usdcAddress", usdcAddress);
        signer = signers[0];
        usdc = IERC20Complete__factory.connect(usdcAddress, signer);
        const whaleSigner = await impersonateAccount(usdcWhale);
        const usdcAmount = await usdc.balanceOf(usdcWhale);
        await usdc
            .connect(whaleSigner)
            .transfer(await signer.getAddress(), usdcAmount);

        receiver = signers[1];
        flash = await new Flash__factory(signer).deploy();
        console.log("flash", flash.address);
    });

    async function getTokenPermitSignature(
        token: IERC20Complete,
        spender: string,
        value: BigNumberish,
        deadline: BigNumberish
    ) {
        const owner = await token.signer.getAddress();
        const [nonce, tokenName, tokenVersion] = await Promise.all([
            token.nonces(owner),
            token.name(),
            "1",
        ]);
        console.log({ nonce, name: tokenName, version: tokenVersion });
        const { chainId } = (await token.provider.getNetwork()) ?? {
            chainId: -1,
        };

        const permitDomain = {
            name: tokenName,
            version: tokenVersion,
            chainId,
            verifyingContract: token.address,
        };
        const permitTypes = {
            Permit: [
                {
                    name: "owner",
                    type: "address",
                },
                {
                    name: "spender",
                    type: "address",
                },
                {
                    name: "value",
                    type: "uint256",
                },
                {
                    name: "nonce",
                    type: "uint256",
                },
                {
                    name: "deadline",
                    type: "uint256",
                },
            ],
        };

        const permitValues = {
            owner,
            spender,
            value,
            nonce,
            deadline,
        };

        const typedSignature = await token.signer._signTypedData(
            permitDomain,
            permitTypes,
            permitValues
        );
        console.log("typedSignature", typedSignature);
        const signature = ethers.utils.splitSignature(typedSignature);

        return {
            permitNonce: nonce,
            permitSignature: {
                v: signature.v,
                r: signature.r,
                s: signature.s,
                deadline,
            },
        };
    }

    async function generatePaySignature(
        permitNonce: BigNumberish,
        receiver: string,
        signer: Signer,
        flash: Flash
    ) {
        const { chainId } = (await signer.provider?.getNetwork()) ?? {
            chainId: -1,
        };

        const payDomain = {
            name: "Flash",
            version: "1",
            chainId,
            verifyingContract: flash.address,
        };
        const payTypes = {
            Pay: [
                {
                    name: "receiver",
                    type: "address",
                },
                {
                    name: "permitNonce",
                    type: "uint256",
                },
            ],
        };

        const payValues = {
            receiver,
            permitNonce,
        };

        const typedSignature = await flash.signer._signTypedData(
            payDomain,
            payTypes,
            payValues
        );
        console.log("typedSignature", typedSignature);
        const signature = ethers.utils.splitSignature(typedSignature);

        return {
            v: signature.v,
            r: signature.r,
            s: signature.s,
        };
    }

    async function generatePaymentStructs(
        token: IERC20Complete,
        amount: BigNumberish,
        deadline: BigNumberish,
        receiverAddress: string,
        flash: Flash
    ) {
        const { permitSignature, permitNonce } = await getTokenPermitSignature(
            token,
            flash.address,
            amount,
            deadline
        );

        const paySignature = await generatePaySignature(
            permitNonce,
            receiverAddress,
            token.signer,
            flash
        );
        console.log("paySignature", paySignature);

        const permitData = {
            deadline,
            signature: permitSignature,
        };

        const paymentData = {
            token: token.address,
            from: await signer.getAddress(),
            to: await receiver.getAddress(),
            amount,
            permitData,
        };
        return {
            paymentData,
            paySignature,
        };
    }

    async function generateVerificationCallData(
        token: IERC20Complete,
        amount: BigNumberish,
        deadline: BigNumberish,
        receiverAddress: string,
        flash: Flash
    ) {
        const { paymentData, paySignature } = await generatePaymentStructs(
            token,
            amount,
            deadline,
            receiverAddress,
            flash
        );

        const verifyDataCallData = flash.interface.encodeFunctionData(
            "verifyData",
            [paymentData, paySignature]
        );
        return verifyDataCallData;
    }

    async function generatePayCallData(
        verifyCallData: string,
        tokenAddress: string,
        amount: BigNumberish,
        receiver: string,
        flash: Flash
    ) {
        const result = await signer.provider?.call({
            to: flash.address,
            data: verifyCallData,
        });
        const expectedResult =
            "0x0000000000000000000000000000000000000000000000000000000000000001";
        if (result !== expectedResult) {
            console.log("result", result);
            throw new Error("verifyData failed");
        }

        const [paymentData, paySignature] = flash.interface.decodeFunctionData(
            "verifyData",
            verifyCallData
        );

        console.log("paymentData", paymentData);
        if (paymentData.token !== tokenAddress) {
            throw new Error("token address mismatch");
        }

        if (!paymentData.amount.eq(amount)) {
            throw new Error("amount mismatch");
        }

        if (paymentData.to !== receiver) {
            throw new Error("receiver mismatch");
        }

        const payCallData = flash.interface.encodeFunctionData("pay", [
            paymentData,
            paySignature,
        ]);
        console.log("payCallData", payCallData);
        return payCallData;
    }

    describe("payment", function () {
        it("can generate permit signature", async function () {
            const relativeDeadline = 60 * 60;
            const deadline =
                Math.floor(new Date().getTime() / 1000) + relativeDeadline;
            const amount = 100;
            const owner = await signer.getAddress();
            const { permitSignature } = await getTokenPermitSignature(
                usdc,
                flash.address,
                amount,
                deadline
            );
            console.log("signature", permitSignature);
            await usdc.permit(
                owner,
                flash.address,
                amount,
                deadline,
                permitSignature.v,
                permitSignature.r,
                permitSignature.s,
                { gasLimit: 2_000_000 }
            );
        });

        it("can generate pay signature", async function () {
            const relativeDeadline = 60 * 60;
            const deadline =
                Math.floor(new Date().getTime() / 1000) + relativeDeadline;
            const amount = 100;
            const owner = await signer.getAddress();

            const { paymentData, paySignature } = await generatePaymentStructs(
                usdc,
                amount,
                deadline,
                await receiver.getAddress(),
                flash
            );

            console.log("paymentData", paymentData);
            const result = await flash.callStatic.verifySignature(
                paymentData,
                paySignature
            );
            console.log("result", result);
        });

        it("data verifies", async function () {
            const relativeDeadline = 60 * 60;
            const deadline =
                Math.floor(new Date().getTime() / 1000) + relativeDeadline;
            const amount = 100;

            const verifyCallData = await generateVerificationCallData(
                usdc,
                amount,
                deadline,
                await receiver.getAddress(),
                flash
            );
            console.log("verifyCallData", verifyCallData);

            const result = await signer.provider?.call({
                to: flash.address,
                data: verifyCallData,
            });
            console.log("result", result);
            const expectedResult =
                "0x0000000000000000000000000000000000000000000000000000000000000001";
            expect(result).to.equal(expectedResult);
        });

        it("can generate payment data", async function () {
            const relativeDeadline = 60 * 60;
            const deadline =
                Math.floor(new Date().getTime() / 1000) + relativeDeadline;
            const amount = 100;

            const verifyCallData = await generateVerificationCallData(
                usdc,
                amount,
                deadline,
                await receiver.getAddress(),
                flash
            );
            console.log("verifyCallData", verifyCallData);

            const payCallData = await generatePayCallData(
                verifyCallData,
                usdc.address,
                amount,
                await receiver.getAddress(),
                flash
            );

            console.log("payCallData", payCallData);
        });
        describe("when contract is paused", function () {
            it("cannot pay", async function () {
                const relativeDeadline = 60 * 60;
                const deadline =
                    Math.floor(new Date().getTime() / 1000) + relativeDeadline;
                const amount = 100;

                const verifyCallData = await generateVerificationCallData(
                    usdc,
                    amount,
                    deadline,
                    await receiver.getAddress(),
                    flash
                );
                console.log("verifyCallData", verifyCallData);

                const payCallData = await generatePayCallData(
                    verifyCallData,
                    usdc.address,
                    amount,
                    await receiver.getAddress(),
                    flash
                );

                await flash.pause();

                console.log("payCallData", payCallData);
                const relatoRelayAddress ="0xaBcC9b596420A9E9172FD5938620E265a0f9Df92"
                const relatoRelaySigner = await impersonateAccount(relatoRelayAddress);
                await setBalance( relatoRelayAddress, ethers.utils.parseEther("100000"));
                await expect(
                    relatoRelaySigner.sendTransaction({
                        to: flash.address,
                        data: payCallData,
                        gasLimit: 2_000_000,
                    })
                ).to.be.revertedWith("Pausable: paused");
            });
        });
    });

    describe("#pause", function () {
        it("can pause", async function () {
            await flash.pause();
        });

        it("non admin cannot pause", async function () {
            await expect(flash.connect(receiver).pause()).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });
    });
    describe("#unpause", function () {
        it("can unpause", async function () {
            await flash.unpause();
        });

        it("non admin cannot unpause", async function () {
            await expect(flash.connect(receiver).unpause()).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });
    });
});
