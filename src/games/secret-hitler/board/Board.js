import React, {Component} from 'react';
import "./Board.css";

// Default layout (matches original theme)
const DEFAULT_LAYOUT = {
  liberalPolicy: { offset: "18.2%", spacing: "13.54%" },
  fascistPolicy: { offset: "11%", spacing: "13.6%" },
  electionTracker: { top: "74%", leftOffset: "34.2%", spacing: "9.16%", width: "3.2%" },
};

class Board extends Component {

    /**
     * Returns the correct board image based on the number of players in the game.
     * @requires this.props.numPlayers must in range [5, 10], inclusive.
     * @return {string} The Fascist board corresponding to the number of players.
     */
    getFascistBoard() {
        const { themeAssets } = this.props;
        if(this.props.numPlayers <= 6) {
            return themeAssets?.boardFascist56 || "/secret-hitler/board-fascist-5-6.png";
        } else if (this.props.numPlayers <= 8) {
            return themeAssets?.boardFascist78 || "/secret-hitler/board-fascist-7-8.png";
        } else {
            return themeAssets?.boardFascist910 || "/secret-hitler/board-fascist-9-10.png";
        }
    }

    /**
     * Places a series of repeating images.
     * @param count {number} the count of currently visible images.
     * @param totalCount {number} the total number of images to place.
     * @param src {Image} the image source to use for the tiles.
     * @param id {String} the HTML id to apply.
     * @param offset {String} the offset from the left of the first tile (given as a %)
     * @param spacing {String} the horizontal offset between each image (given as %)
     * @returns {<img>[]} an array of {@literal <img>} tags of length {@code totalCount}. Each image has the given
     *          {@code id} identity, {@code src} as an image source. There will be {@code spacing} between each image, and
     *          all images will be offset by {@code offset}.
     *          The first {@code count} images from the left will be given the class-name "show", the remaining will be given
     *          the class-name "hide".
     */
    placeRepeating(count, totalCount, src, id, offset, spacing) {
        let images = [];
        let index = 0;
        for(index; index < totalCount; index++) {
            let className = "hide";
            if (index < count) {
                className = "show";
            }
            images[index] = (
                <img src={src}
                     id={id}
                     style={{position: "absolute", left:"calc(" + offset + " + " + index.toString() + "*" + spacing +")"}}
                     alt={""}
                     className={className}
                     key={index}
                />
            );
        }
        return images;
    }

    render() {
        const { themeAssets, themeLayout, themeLabels } = this.props;
        const layout = themeLayout || DEFAULT_LAYOUT;

        // Get themed labels or fall back to defaults
        const liberalPoliciesLabel = themeLabels?.liberalPolicies || "liberal policies";
        const fascistPoliciesLabel = themeLabels?.fascistPolicies || "fascist policies";

        const liberalBoard = themeAssets?.boardLiberal || "/secret-hitler/board-liberal.png";
        const electionTracker = themeAssets?.boardTracker || "/secret-hitler/board-tracker.png";
        const policyLiberal = themeAssets?.boardPolicyLiberal || "/secret-hitler/board-policy-liberal.png";
        const policyFascist = themeAssets?.boardPolicyFascist || "/secret-hitler/board-policy-fascist.png";

        // Get layout positions from theme
        const { liberalPolicy, fascistPolicy, electionTracker: etLayout } = layout;

        return (
            <div id="board-container">
                <div id="board-group">
                    <img id="board"
                         src={liberalBoard}
                         alt={this.props.numLiberalPolicies + " " + liberalPoliciesLabel + " have been passed."}
                    />
                    <img id="election-tracker"
                         src={electionTracker}
                         style={{
                             position: "absolute",
                             top: etLayout.top,
                             left: `calc(${etLayout.leftOffset} + ${this.props.electionTracker}*${etLayout.spacing})`,
                             width: etLayout.width
                         }}
                         alt={"Election tracker at position " + this.props.electionTracker + " out of 3."}
                    />
                    {this.placeRepeating(
                        this.props.numLiberalPolicies,
                        5,
                        policyLiberal,
                        "policy",
                        liberalPolicy.offset,
                        liberalPolicy.spacing
                    )}
                </div>

                <div id="board-group">
                    <img
                      id="board"
                      src={this.getFascistBoard()}
                      alt={this.props.numFascistPolicies + " " + fascistPoliciesLabel + " have been passed."}
                    />
                    {this.placeRepeating(
                        this.props.numFascistPolicies,
                        6,
                        policyFascist,
                        "policy",
                        fascistPolicy.offset,
                        fascistPolicy.spacing
                    )}
                </div>
            </div>
        );
    }

}

Board.defaultProps = {
    numFascistPolicies: 5,
    numLiberalPolicies: 6,
    electionTracker: 0,
    numPlayers: 5,
    themeAssets: null,
    themeLayout: null,
    themeLabels: null
};

export default Board;
