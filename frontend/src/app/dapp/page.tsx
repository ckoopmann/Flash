"use client";
import UserInfo from "@/components/user/UserInfo";

import {
    Card,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";


export default function Home() {
    return (
        <div  className="flex flex-col min-h-screen items-center justify-center">
            <Card className="flex flex-col items-center justify-evenly">
                <CardHeader className="pb-12">
                    <CardTitle>My Account</CardTitle>
                </CardHeader>

                <UserInfo className="pb-12 w-4/5" />
            </Card>
        </div>
    );
}
