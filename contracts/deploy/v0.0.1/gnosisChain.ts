import {DeployFunction} from 'hardhat-deploy/types';
import { getNamedAccounts, deployments, getChainId, ethers } from "hardhat";


const func: DeployFunction = async function () {
    if (process.env.DEPLOY !== "v0.0.1.gnosisChain") {
        return;
    }
    const { deploy } = deployments;
    const sdaiAddress = "0xaf204776c7245bF4147c2612BF6e5972Ee483701";

    let { deployer } = await getNamedAccounts();
    console.log("deployer:", deployer);

    console.log("\nDeploying Flash...");
    const flash = await deploy("Flash", {
        from: deployer,
        args: [sdaiAddress],
    });
    console.log("Flash deployed to:", flash.address);
};
export default func;
