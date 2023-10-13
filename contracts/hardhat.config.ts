import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";

const gnosisRPCURL = "https://rpc.gnosischain.com";
const config: HardhatUserConfig = {
    solidity: "0.8.20",
    networks: {
        hardhat: {
            forking: {
                url: gnosisRPCURL,
                blockNumber: 30402407,
            },
            chainId: 100,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
};

export default config;
