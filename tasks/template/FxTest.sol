import "@maticnetwork/fx-portal/contracts/tunnel/FxBaseChildTunnel.sol";


contract FxTest is FxBaseChildTunnel {
    constructor(address _fxChild) FxBaseChildTunnel(_fxChild) {}

    function _processMessageFromRoot(
        uint256,
        address,
        bytes memory
    ) internal virtual override {

    }
}
