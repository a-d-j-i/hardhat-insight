//SPDX-License-Identifier: Unlicense
pragma solidity ___compilerVersion___;

import "./Base1.sol";
import "./Base2.sol";
import "hardhat/console.sol";

contract Greeter is Base1, Base2 {
    struct SG {uint16 a; uint16 b; uint256 c;}

    uint public x;
    mapping(uint => mapping(uint => SG)) public data;
    SG public sData;

    string public greeting;
    uint256 public other;

    constructor(string memory _greeting) ___constructorVisibility___ Base1(_greeting)  Base2(_greeting) {
        console.log("Deploying a Greeter with greeting:", _greeting);
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        console.log("Changing greeting from '%s' to '%s'", greeting, _greeting);
        greeting = _greeting;
        other = other++;
    }
}
