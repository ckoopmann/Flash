import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumberish, Contract, Signer } from "ethers";
import {
    Flash,
    Flash__factory,
    IERC20Complete,
    IERC20Complete__factory,
} from "../typechain-types";

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
        owner: string,
        spender: string,
        value: BigNumberish,
        deadline: BigNumberish
    ) {
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

    it("can generate permit signature", async function () {
        const relativeDeadline = 60 * 60;
        const deadline =
            Math.floor(new Date().getTime() / 1000) + relativeDeadline;
        const amount = 100;
        const owner = await signer.getAddress();
        const {permitSignature} = await getTokenPermitSignature(
            usdc,
            owner,
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
        const {  permitSignature, permitNonce } =
            await getTokenPermitSignature(
                usdc,
                owner,
                flash.address,
                amount,
                deadline
            );

        const paySignature = await generatePaySignature(
            permitNonce,
            await receiver.getAddress(),
            signer,
            flash
        );
        console.log("paySignature", paySignature);

        const permitData = {
            deadline,
            signature: permitSignature,
        };

        const paymentData = {
            token: usdc.address,
            from: owner,
            to: await receiver.getAddress(),
            amount,
            permitData,
        };

        console.log("paymentData", paymentData);
        const result = await flash.callStatic.verifySignature(paymentData, paySignature);
        console.log("result", result);
    });
});
