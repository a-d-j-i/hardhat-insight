//SPDX-License-Identifier: Unlicense
pragma solidity ___compilerVersion___;

import "hardhat/console.sol";

contract Base2 {
    struct S2 {uint16 a; uint16 b; uint256 c;}

    uint public x2;
    mapping(uint => mapping(uint => S2)) public data2;
    S2 public sData2;

    struct SX2 {
        uint128 a;
        uint128 b;
        uint[2] staticArray;
        uint[] dynArray;
    }

    uint public x02;
    uint public y2;
    SX2 public sx2;
    address public addr2;
    mapping(uint => mapping(address => bool)) public map2;
    uint[] public array2;
    string public s2;
    bytes public b2;

    string public greeting2;
    uint256 public other2;

    constructor(string memory _greeting) ___constructorVisibility___ {
        console.log("Deploying a Greeter with greeting:", _greeting);
        greeting2 = _greeting;
    }

    function greetBase2() public view returns (string memory) {
        return greeting2;
    }

    function setGreetingBase2(string memory _greeting) public {
        console.log("Changing greeting from '%s' to '%s'", greeting2, _greeting);
        greeting2 = _greeting;
        other2 = other2++;
    }
}
