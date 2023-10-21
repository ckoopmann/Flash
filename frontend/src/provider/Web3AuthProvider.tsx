import { createContext, useContext, useState, useEffect } from "react";
import { Web3AuthModalPack, Web3AuthConfig } from "@safe-global/auth-kit";
import { Web3AuthOptions } from "@web3auth/modal";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { CHAIN_NAMESPACES, WALLET_ADAPTERS } from "@web3auth/base";
import { ethers } from "ethers";

export interface Web3AuthContextType {
    ethersProvider: ethers.providers.Web3Provider | null;
    ethersSigner: ethers.Signer | null;
}
{
    /* const provider = new ethers.providers.Web3Provider(this.provider); */
}

export const Web3AuthContext = createContext<Web3AuthContextType | null>(null);

export const useWeb3Auth = () => useContext(Web3AuthContext);

// Instantiate and initialize the pack
export function Web3AuthProvider({ children }: { children: React.ReactNode }) {
    let [web3authContext, setWeb3AuthContext] =
        useState<Web3AuthContextType | null>(null);

    async function logIn() {
        try {
            const options: Web3AuthOptions = {
                clientId:
                    "BCR9StsWlvbfz7P_USY5zZoHpH5VzKY2fBM5LKT5w9XxCAmylEH5wTt3aFTRVYWQl4wfu4F-yMxwF6teQ4LQuLI",
                web3AuthNetwork: "testnet",
                chainConfig: {
                    chainNamespace: CHAIN_NAMESPACES.EIP155,
                    chainId: "0x64",
                    rpcTarget: "https://rpc.gnosischain.com",
                },
                uiConfig: {
                    theme: "dark",
                    loginMethodsOrder: ["google", "facebook"],
                },
            };

            const modalConfig = {
                [WALLET_ADAPTERS.TORUS_EVM]: {
                    label: "torus",
                    showOnModal: false,
                },
                [WALLET_ADAPTERS.METAMASK]: {
                    label: "metamask",
                    showOnDesktop: true,
                    showOnMobile: false,
                },
            };

            const openloginAdapter = new OpenloginAdapter({
                loginSettings: {
                    mfaLevel: "mandatory",
                },
                adapterSettings: {
                    uxMode: "popup",
                    whiteLabel: {
                        name: "Safe",
                    },
                },
            });

            const web3AuthModalPack = new Web3AuthModalPack({
                txServiceUrl: "https://safe-transaction-goerli.safe.global",
            });

            await web3AuthModalPack.init({
                options,
                adapters: [openloginAdapter],
                modalConfig,
            });
            console.log("init complete");
            const web3AuthProvider = web3AuthModalPack.getProvider();
            if (!web3AuthProvider) {
                throw new Error("No provider");
            }
            console.log("web3AuthProvider: ", web3AuthProvider);
            const ethersProvider = new ethers.providers.Web3Provider(
                web3AuthProvider
            );
            const ethersSigner = ethersProvider.getSigner();
            setWeb3AuthContext({
                ethersProvider,
                ethersSigner,
            });
            console.log("Logged in");
        } catch (e) {
            console.error("Error logging in: ", e);
        }
    }

    useEffect(() => {
        logIn();
    }, []);

    return (
        <Web3AuthContext.Provider value={web3authContext}>
            {children}
        </Web3AuthContext.Provider>
    );
}
