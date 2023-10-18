import { defineConfig } from "@dethcrypto/eth-sdk";

export default defineConfig({
    contracts: {
        gnosis: {
            usdc: "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83",
            flash: "0xc67d1bFD13F28cAA8FE2Bb5D73fD228166aC8df0",
        },
    },
    etherscanURLs: {
        gnosis: "https://api.gnosisscan.io/api",
    },
    rpc: {
        gnosis: "https://rpc.gnosischain.com",
    },
});
