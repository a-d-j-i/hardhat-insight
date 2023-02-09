const hre = require("hardhat");
const assert = require("assert");
const {sumSlots} = require("../lib/model");

describe(`tests for sumSlots`, function () {
  it("nothing", async function () {
    const slots = sumSlots([])
    assert.strictEqual(slots, 0);
  })
  it("struct with uints", async function () {
    const slots = sumSlots([
        {
          nodeType: 'ElementaryTypeName',
          typeDescriptions: {typeIdentifier: 't_uint16', typeString: 'uint16'}
        },
        {
          nodeType: 'ElementaryTypeName',
          typeDescriptions: {typeIdentifier: 't_uint256', typeString: 'uint256'}
        }
      ]
    )
    assert.strictEqual(slots, 2);
  })
  it("SX0", async function () {
    const slots = sumSlots([
        {
          "nodeType": "ElementaryTypeName",
          "typeDescriptions": {
            "typeString": "uint128"
          }
        },
        {
          "nodeType": "ElementaryTypeName",
          "typeDescriptions": {
            "typeString": "uint128"
          }
        },
        {
          "nodeType": "ArrayTypeName",
          "typeDescriptions": {
            "typeString": "uint256[2]"
          },
          "length": {
            "value": "2"
          },
          "baseType": {
            "id": 26,
            "name": "uint",
            "nodeType": "ElementaryTypeName",
            "src": "319:4:0",
            "typeDescriptions": {
              "typeString": "uint256"
            }
          }
        },
        {
          "nodeType": "ArrayTypeName",
          "typeDescriptions": {
            "typeString": "uint256[]"
          },
          "baseType": {
            "id": 30,
            "name": "uint",
            "nodeType": "ElementaryTypeName",
            "src": "348:4:0",
            "typeDescriptions": {
              "typeString": "uint256"
            }
          }
        }
      ]
    )
    assert.strictEqual(slots, 4);
  })

})
