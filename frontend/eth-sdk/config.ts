import { defineConfig } from "@dethcrypto/eth-sdk";

export default defineConfig({
    contracts: {
        gnosis: {
            sdai: "0xaf204776c7245bF4147c2612BF6e5972Ee483701",
            flash: "0x0BF8Bbd1C9C20234D15d848BFffd50134a112df4",
        },
    },
    etherscanURLs: {
        gnosis: "https://api.gnosisscan.io/api",
    },
    rpc: {
        gnosis: "https://rpc.gnosischain.com",
    },
});
