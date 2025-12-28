import React, { Component } from "react";
import { SendWSCommand, WSCommandType } from "../types";
import ButtonPrompt from "./ButtonPrompt";

type DiscussionPromptProps = {
  isVIP: boolean;
  isPresident: boolean;
  sendWSCommand: SendWSCommand;
  onConfirm: () => void;
};

class DiscussionPrompt extends Component<DiscussionPromptProps> {
  constructor(props: DiscussionPromptProps) {
    super(props);
    this.onClickEndDiscussion = this.onClickEndDiscussion.bind(this);
  }

  onClickEndDiscussion() {
    this.props.sendWSCommand({ command: WSCommandType.END_DISCUSSION });
    this.props.onConfirm();
  }

  render() {
    const { isVIP, isPresident } = this.props;
    // President or VIP can end discussion
    const canEndDiscussion = isVIP || isPresident;

    return (
      <ButtonPrompt
        label={"DISCUSSION"}
        renderHeader={() => {
          return (
            <>
              <p>
                Take this time to discuss the events of the last round with your
                fellow players.
              </p>
              <p style={{ fontStyle: "italic", marginTop: "1em" }}>
                Who do you trust? Who seems suspicious?
              </p>
            </>
          );
        }}
        renderFooter={() => {
          if (!canEndDiscussion) {
            return (
              <p style={{ marginTop: "1em", opacity: 0.7 }}>
                Waiting for the president to continue...
              </p>
            );
          }
          return null;
        }}
        buttonText={canEndDiscussion ? "CONTINUE" : "WAITING..."}
        buttonDisabled={!canEndDiscussion}
        buttonOnClick={this.onClickEndDiscussion}
      />
    );
  }
}

export default DiscussionPrompt;
