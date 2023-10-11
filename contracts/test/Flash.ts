import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumberish, Contract, Signer } from "ethers";
import {
    Flash,
    Flash__factory,
    IERC20Complete,
    IERC20Complete__factory,
} from "../typechain-types";

describe("Flash", function () {
    let flash: Flash;
    const usdcAddress =  "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83";
    let usdc: IERC20Complete;
    let signer: Signer;
    before(async function () {
        const signers = await ethers.getSigners();
        console.log("usdcAddress", usdcAddress);
        signer = signers[0];
        flash = await new Flash__factory(signer).deploy();
        console.log("flash", flash.address);
        usdc = IERC20Complete__factory.connect(usdcAddress, signer);
    });

    async function getTokenPermitSignature(
        token: IERC20Complete,
        owner: string,
        spender: string,
        value: BigNumberish,
        deadline: BigNumberish
    ) {
        const [nonce, name, version] = await Promise.all([
            token.nonces(owner),
            token.name(),
            "1",
        ]);
        console.log({ nonce, name, version });
        const { chainId } = (await token.provider.getNetwork()) ?? {
            chainId: -1,
        };
        console.log("chainId", chainId);

        const typedSignature = await token.signer._signTypedData(
            {
                name,
                version,
                chainId,
                verifyingContract: token.address,
            },
            {
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
            },
            {
                owner,
                spender,
                value,
                nonce,
                deadline,
            }
        );
        console.log("splitSignature");

        const signature = ethers.utils.splitSignature(typedSignature);
        return {
            v: signature.v,
            r: signature.r,
            s: signature.s,
            deadline,
            sender: owner,
        };
    }

    it("can generate signature", async function () {
        const relativeDeadline = 60 * 60;
        const deadline = Math.floor(new Date().getTime() / 1000) + relativeDeadline;
        const amount = 100;
        const owner = await signer.getAddress();
        const signature = await getTokenPermitSignature(
            usdc,
            owner,
            flash.address,
            amount,
            deadline
        );
        console.log("signature", signature);
        await usdc.permit(
            owner,
            flash.address,
            amount,
            deadline,
            signature.v,
            signature.r,
            signature.s,
            {gasLimit: 2_000_000}
        );

    });
});
