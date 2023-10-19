"use client";
import { useEffect, useState } from "react";
import { useWeb3Auth } from "@/provider/Web3AuthProvider";
import { Label } from "@/components/ui/label";
import { getGnosisSdk } from "@dethcrypto/eth-sdk-client";
import { ethers } from "ethers";
import {
    PaymentsReceivedDocument,
    PaymentsSentDocument,
    execute,
} from "../../../.graphclient";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type Payment = {
    direction: "sent" | "received";
    amount: string;
    transactionHash: string;
    timestamp: number;
};
function UserInfo({ className }: { className?: string }) {
    const web3AuthContext = useWeb3Auth();
    const [userAddress, setUserAddress] = useState("...");
    const [userBalance, setUserBalance] = useState("...");
    const [payments, setPayments] = useState<Payment[]>([]);
    useEffect(() => {
        const init = async () => {
            const signer = web3AuthContext?.ethersSigner;
            if (!signer) {
                console.error("Getting user signer failed");
                return;
            }
            const address = await signer.getAddress();
            if (!address) {
                console.error("Getting user address failed");
                return;
            }
            console.log("User Address: ", address);
            setUserAddress(address);

            const sdk = getGnosisSdk(signer);
            const balance = await sdk.usdc.balanceOf(address);
            if (!balance) {
                console.error("Getting user balance failed");
                return;
            }
            console.log("User Balance: ", balance);
            setUserBalance(ethers.utils.formatUnits(balance, 6));
            const paymentsReceived = await execute(PaymentsReceivedDocument, {
                user: address,
            });
            console.log("Payments received: ", paymentsReceived);
            let payments = paymentsReceived.data.payments.map(
                (payment: any) => ({
                    direction: "received",
                    amount: ethers.utils.formatUnits(payment.amount, 6),
                    timestamp: parseInt(payment.blockTimestamp),
                    transactionHash: payment.transactionHash,
                })
            );
            const paymentsSent = await execute(PaymentsSentDocument, {
                user: address,
            });
            console.log("Payments sent: ", paymentsSent);
            payments = payments.concat(
                paymentsSent.data.payments.map((payment: any) => ({
                    direction: "sent",
                    amount: ethers.utils.formatUnits(payment.amount, 6),
                    timestamp: parseInt(payment.blockTimestamp),
                    transactionHash: payment.transactionHash,
                }))
            );
            payments.sort((a: any, b: any) =>
                a.timestamp > b.timestamp ? -1 : 1
            );
            setPayments(payments);
        };
        init();
    }, [web3AuthContext]);

    return (
        <>
            <div className={className}>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label className="text-xl">Current Balance:</Label>
                    <div className="text-3xl font-bold">{userBalance} $</div>
                </div>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label className="text-xl">Transaction History:</Label>
                    <Table>
                        <TableBody>
                            {payments.map((payment) => (
                                <TableRow>
                                    <TableCell>
                                        {payment.timestamp
                                            ? new Date(
                                                  payment.timestamp * 1000
                                              ).toLocaleString()
                                            : ""}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {payment.direction == "received" ? "+" : "-"} {payment.amount} $
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </>
    );
}

export default UserInfo;
