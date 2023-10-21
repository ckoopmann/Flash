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
    const sdaiAddress = "0xaf204776c7245bF4147c2612BF6e5972Ee483701";
    const sdaiWhale = "0x7404becad09351583443720f8f520f689e93359e";
    // const flashAddress = "0xc67d1bFD13F28cAA8FE2Bb5D73fD228166aC8df0";
    let sdai: IERC20Complete;
    let signer: Signer;
    let receiver: Signer;
    let snapshot: string;
    let flashOwnerSigner: Signer;

    before(async function () {
        const signers = await ethers.getSigners();
        console.log("sdaiAddress", sdaiAddress);
        signer = signers[0];

        sdai = IERC20Complete__factory.connect(sdaiAddress, signer);

        receiver = signers[1];
        flash = await new Flash__factory(signer).deploy(sdaiAddress);
        console.log("flash", flash.address);
        const flashOwner = await flash.owner();
        flashOwnerSigner = await impersonateAccount(flashOwner);
        const whaleSigner = await impersonateAccount(sdaiWhale);
        const sdaiAmount = await sdai.balanceOf(sdaiWhale);
        await sdai
            .connect(whaleSigner)
            .transfer(await signer.getAddress(), sdaiAmount);
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
                sdai,
                flash.address,
                amount,
                deadline
            );
            console.log("signature", permitSignature);
            await sdai.permit(
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

            const { paymentData, paySignature } = await generatePaymentStructs(
                sdai,
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
                sdai,
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
                sdai,
                amount,
                deadline,
                await receiver.getAddress(),
                flash
            );
            console.log("verifyCallData", verifyCallData);

            const payCallData = await generatePayCallData(
                verifyCallData,
                sdai.address,
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
                    sdai,
                    amount,
                    deadline,
                    await receiver.getAddress(),
                    flash
                );
                console.log("verifyCallData", verifyCallData);

                const payCallData = await generatePayCallData(
                    verifyCallData,
                    sdai.address,
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
