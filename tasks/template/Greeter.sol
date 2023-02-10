//SPDX-License-Identifier: Unlicense
pragma solidity ___compilerVersion___;

import "./Base1.sol";
import "./Base2.sol";
import "hardhat/console.sol";

interface IFace {
    function someFunc() external;
}

contract Greeter is Base1, Base2 {
    struct SG {uint16 a; uint16 b; uint256 c;}

    struct SG1 {IFace a; uint16 gap; IFace b;}

    struct SG2 {SG1 a; SG b;}

    uint public x;
    mapping(uint => mapping(uint => SG)) public data;
    SG public sData;
    string public greeting;
    uint256 public other;

    uint128 p1;
    uint128 p2;
    uint16 p3;
    uint128 p4;
    uint32 p5;
    uint8 p6;
    uint8 p7;
    uint8 p8;
    bytes32 constant NAMESPACE_SLOT = keccak256("Namespace");

    struct Namespace {
        uint var1;
        bytes var2;
        mapping(address => uint) var3;
    }

    bytes var1;
    bytes[1] var2;
    bytes[31] var3;
    bytes[32] var4;
    mapping(address => uint) var5;
    uint256 e;

    IFace iface;
    SG1 ifaceStruct;
    SG2 ifaceStruct2;
    uint256 e1;

    constructor(string memory _greeting) ___constructorVisibility___ Base1(_greeting)  Base2(_greeting) {
        console.log("Deploying a Greeter with greeting:", _greeting);
        greeting = _greeting;
        //>7        _s().var1 = 1;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        console.log("Changing greeting from '%s' to '%s'", greeting, _greeting);
        greeting = _greeting;
        other = other++;
        //>7        _s().var1 = _s().var1++;
    }

    //>7    function _s() internal pure returns (Namespace storage ret)
    //>7    {
    //>7        bytes32 position = NAMESPACE_SLOT;
    //>7        assembly {ret.slot := position}
    //>7    }
}
