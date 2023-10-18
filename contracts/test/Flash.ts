import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Signer } from "ethers";
import {
    Flash,
    Flash__factory,
    IERC20Complete,
    IERC20Complete__factory,
} from "../typechain-types";

import { setBalance } from "@nomicfoundation/hardhat-network-helpers";
import {
    getTokenPermitSignature,
    generatePaymentStructs,
    generatePayCallData,
    generateVerificationCallData,
} from "./utils";

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
    const flashAddress = "0xc67d1bFD13F28cAA8FE2Bb5D73fD228166aC8df0";
    let usdc: IERC20Complete;
    let signer: Signer;
    let receiver: Signer;
    let snapshot: string;
    let flashOwnerSigner: Signer;

    before(async function () {
        const signers = await ethers.getSigners();
        console.log("usdcAddress", usdcAddress);
        signer = signers[0];

        usdc = IERC20Complete__factory.connect(usdcAddress, signer);

        receiver = signers[1];
        flash = Flash__factory.connect(flashAddress, signer);
        console.log("flash", flash.address);
        const flashOwner = await flash.owner();
        flashOwnerSigner = await impersonateAccount(flashOwner);
        const whaleSigner = await impersonateAccount(usdcWhale);
        const usdcAmount = await usdc.balanceOf(usdcWhale);
        await usdc
            .connect(whaleSigner)
            .transfer(await signer.getAddress(), usdcAmount);
    });

    beforeEach(async function () {
        snapshot = await ethers.provider.send("evm_snapshot", []);
        console.log("snapshot", snapshot);
    });
    afterEach(async function () {
        await ethers.provider.send("evm_revert", [snapshot]);
    });

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

                await flash.connect(flashOwnerSigner).pause();
                console.log("payCallData", payCallData);
                const relatoRelayAddress =
                    "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92";
                const relatoRelaySigner = await impersonateAccount(
                    relatoRelayAddress
                );
                await setBalance(
                    relatoRelayAddress,
                    ethers.utils.parseEther("100000")
                );
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
            await flash.connect(flashOwnerSigner).pause();
        });

        it("non admin cannot pause", async function () {
            await expect(flash.connect(receiver).pause()).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });
    });
    describe("#unpause", function () {
        beforeEach(async function () {
            await flash.connect(flashOwnerSigner).pause();
        });
        it("can unpause", async function () {
            await flash.connect(flashOwnerSigner).unpause();
        });

        it("non admin cannot unpause", async function () {
            await expect(flash.connect(receiver).unpause()).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });
    });
});
