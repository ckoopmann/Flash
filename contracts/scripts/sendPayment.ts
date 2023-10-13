import { getNamedAccounts, deployments, getChainId, ethers } from "hardhat";
import { GelatoRelay, CallWithSyncFeeRequest } from "@gelatonetwork/relay-sdk";
import { Flash__factory, IERC20Complete__factory } from "../typechain-types";
import {
    generatePayCallData,
    generateVerificationCallData,
} from "../test/utils.ts";

async function createTask(
    data: string,
    target: string,
    chainId: number,
    feeToken: string
) {
    const relay = new GelatoRelay();
    const request: CallWithSyncFeeRequest = {
        chainId,
        target,
        data,
        feeToken,
        isRelayContext: true,
    };
    const { taskId } = await relay.callWithSyncFee(request);
    return taskId;
}

export async function awaitTask(taskId: string) {
    const relay = new GelatoRelay();
    const taskFulfilledPromise = new Promise((resolve, reject) => {
        const maxRetry = 100;
        let retryNum = 0;
        const interval = setInterval(async () => {
            retryNum++;
            if (retryNum > maxRetry) {
                clearInterval(interval);
                reject("Max retry reached");
            }
            const taskStatus = await relay.getTaskStatus(taskId);
            console.log("Task Status", taskStatus);
            if (taskStatus?.taskState == "ExecSuccess") {
                clearInterval(interval);
                resolve(taskStatus);
            }
        }, 500);
    });
    return await taskFulfilledPromise;
}

async function main() {
    const { address: flashAddress } = await deployments.get("Flash");
    console.log("Flash deployed to:", flashAddress);

    let { deployer } = await getNamedAccounts();
    console.log("deployer:", deployer);
    const deployerSigner = await ethers.getSigner(deployer);
    const flash = Flash__factory.connect(flashAddress, deployerSigner);

    const { chainId } = (await ethers.provider.getNetwork()) ?? {
        chainId: -1,
    };
    console.log("chainId:", chainId);

    let amount = ethers.utils.parseUnits("0.001", 6);
    let receiver = "0x31B50d926f9d01A476a7225F5b807f7807B39B0A";
    const usdcAddress = "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83";
    const usdc = IERC20Complete__factory.connect(usdcAddress, deployerSigner);
    const relativeDeadline = 60 * 60;
    const deadline = Math.floor(new Date().getTime() / 1000) + relativeDeadline;
    let verifyCalldata = await generateVerificationCallData(
        usdc,
        amount,
        deadline,
        receiver,
        flash
    );

    let payCalldata = await generatePayCallData(
        verifyCalldata,
        usdcAddress,
        amount,
        receiver,
        flash
    );
    const task = await createTask(
        payCalldata,
        flash.address,
        chainId,
        usdcAddress
    );
    await awaitTask(task);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
