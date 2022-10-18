//SPDX-License-Identifier: Unlicense
pragma solidity ___compilerVersion___;

import "hardhat/console.sol";

contract Base0 {
    struct S0 {uint16 a; uint16 b; uint256 c;}

    uint public x0;
    mapping(uint => mapping(uint => S0)) public data0;
    S0 public sData0;

    struct SX0 {
        uint128 a;
        uint128 b;
        uint[2] staticArray;
        uint[] dynArray;
    }

    uint public x00;
    uint public y0;
    SX0 public sx0;
    address public addr0;
    mapping(uint => mapping(address => bool)) public map0;
    uint[] public array0;
    string public s0;
    bytes public b0;

    string public greeting0;
    uint256 public other0;

    constructor(string memory _greeting) ___constructorVisibility___ {
        console.log("Deploying a Greeter with greeting:", _greeting);
        greeting0 = _greeting;
    }

    function greetBase0() public view returns (string memory) {
        return greeting0;
    }

    function setGreetingBase0(string memory _greeting) public {
        console.log("Changing greeting from '%s' to '%s'", greeting0, _greeting);
        greeting0 = _greeting;
        other0 = other0++;
    }
}
