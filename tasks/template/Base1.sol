//SPDX-License-Identifier: Unlicense
pragma solidity ___compilerVersion___;

import "./Base0.sol";
import "hardhat/console.sol";

contract Base1 is Base0 {
    struct S1 {uint16 a; uint16 b; uint256 c;}

    uint public x1;
    mapping(uint => mapping(uint => S1)) public data1;
    S1 public sData1;

    struct SX1 {
        uint128 a;
        uint128 b;
        uint[2] staticArray;
        uint[] dynArray;
    }

    uint public x01;
    uint public y1;
    SX1 public sx1;
    address public addr1;
    mapping(uint => mapping(address => bool)) public map1;
    uint[] public array1;
    string public s1;
    bytes public b1;

    string public greeting1;
    uint256 public other1;

    constructor(string memory _greeting) ___constructorVisibility___ Base0(_greeting) {
        console.log("Deploying a Greeter with greeting:", _greeting);
        greeting1 = _greeting;
    }

    function greetBase1() public view returns (string memory) {
        return greeting1;
    }

    function setGreetingBase1(string memory _greeting) public {
        console.log("Changing greeting from '%s' to '%s'", greeting1, _greeting);
        greeting1 = _greeting;
        other1 = other1++;
    }
}
