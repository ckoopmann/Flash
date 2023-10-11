import { expect } from "chai";
import { ethers } from "hardhat";

describe("Flash", function () {
    let flash: any;
    before(async function () {
        const Flash = await ethers.getContractFactory("Flash");
        flash = await Flash.deploy();
    });

    it("is deployed", function () {
        expect(flash.address).to.properAddress;
    });
});
