import { createContext  } from 'react';
import { Web3Auth } from "@web3auth/modal";
    import { IProvider } from "@web3auth/base";
import { ethers } from "ethers";

export interface Web3AuthContextType {
    web3Auth: Web3Auth | null;
    web3AuthProvider: IProvider | null;
    ethersProvider: ethers.providers.Web3Provider | null;
    ethersSigner: ethers.Signer | null;

}
{/* const provider = new ethers.providers.Web3Provider(this.provider); */}

export const Web3AuthContext = createContext<Web3AuthContextType | null>(null);
