import {DeployFunction} from 'hardhat-deploy/types';
import { getNamedAccounts, deployments, getChainId, ethers } from "hardhat";


const func: DeployFunction = async function () {
    if (process.env.DEPLOY !== "v0.0.1.gnosisChain") {
        return;
    }
    const { deploy } = deployments;

    let { deployer } = await getNamedAccounts();
    console.log("deployer:", deployer);

    console.log("\nDeploying Flash...");
    const flash = await deploy("Flash", {
        from: deployer,
        args: [],
    });
    console.log("Flash deployed to:", flash.address);
};
export default func;
