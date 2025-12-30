import React, {Component} from "react";
import PropTypes from "prop-types";
// Static paths
const IconFascist = "/secret-hitler/player-icon-fascist.png";
const IconHitler = "/secret-hitler/player-icon-hitler.png";
const IconLiberal = "/secret-hitler/player-icon-liberal.png";

import './PlayerPolicyStatus.css';

const NUM_HITLER_PLAYERS = 1;
const MAX_FASCIST_POLICIES = 11;
const MAX_LIBERAL_POLICIES = 6;

class PlayerPolicyStatus extends  Component {

    render() {
        let fascistPlayers, liberalPlayers;
        let props = this.props;
        const { themeLabels } = props;

        // Get themed labels or fall back to defaults
        const liberalLabel = themeLabels?.liberal || "Liberal";
        const fascistLabel = themeLabels?.fascist || "Fascist";
        const hitlerLabel = themeLabels?.hitler || "Hitler";

        if (props.playerCount <= 6) {
            fascistPlayers = 1;
        } else if (props.playerCount <= 8) {
            fascistPlayers = 2;
        } else {
            fascistPlayers = 3;
        }
        liberalPlayers = props.playerCount - fascistPlayers - NUM_HITLER_PLAYERS;

        return (
            <div id={"pps-container"}>
                <p id={"pps-text"}>
                    Players:
                </p>
                <div id={"pps-icon-container"}>
                    <img id="pps-icon" src={IconLiberal} alt={liberalLabel}/>
                    <p id={"pps-icon-number"} className={"highlight-blue"}>{liberalPlayers}</p>
                    <img id="pps-icon" src={IconFascist} alt={fascistLabel}/>
                    <p id={"pps-icon-number"} className={"highlight"}>{fascistPlayers}</p>
                    <img id="pps-icon" src={IconHitler} alt={hitlerLabel}/>
                    <p id={"pps-icon-number"}  className={"highlight"}>{NUM_HITLER_PLAYERS}</p>
                </div>

                <p id={"pps-text"}>
                    Unenacted Policies:
                </p>
                <div id={"pps-icon-container"}>
                    <img id="pps-icon" className={"highlight-blue"} src={IconLiberal} alt={liberalLabel}/>
                    <p id={"pps-icon-number"} className={"highlight-blue"}>{MAX_LIBERAL_POLICIES - props.numLiberalPolicies}</p>
                    <img id="pps-icon" className={"highlight"} src={IconFascist} alt={fascistLabel}/>
                    <p id={"pps-icon-number"} className={"highlight"}>{MAX_FASCIST_POLICIES - props.numFascistPolicies}</p>
                </div>
            </div>
        )
    }
}

PlayerPolicyStatus.propTypes = {
    numFascistPolicies: PropTypes.number.isRequired,
    numLiberalPolicies: PropTypes.number.isRequired,
    playerCount: PropTypes.number.isRequired,
    themeLabels: PropTypes.object,
};

export default PlayerPolicyStatus;