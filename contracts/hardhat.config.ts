import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

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
};

export default config;
