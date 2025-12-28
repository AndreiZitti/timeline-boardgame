import React, {Component} from 'react';
import "./EventBar.css";

class EventBar extends Component {

    constructor(props) {
        super(props);
        this.state = {
            inStartingState: true
        };
    }

    componentDidUpdate(prevProps) {
        // Move setState logic out of render - React 19 enforces this
        if (this.props.show && this.state.inStartingState) {
            this.setState({ inStartingState: false });
        }
    }

    getClass() {
        if (this.state.inStartingState) {
            return "start-eventbar";
        } else if (this.props.show) {
            return "appear-eventbar";
        } else {
            return "disappear-eventbar";
        }
    }

    render() {
        return (
            <div id="event-bar" className={this.getClass()}>
                <div id="bar-background" className={this.getClass()} />
                <h1 id="event-bar-text" className={this.getClass()}>{this.props.message}</h1>
            </div>
        );
    }
}

EventBar.defaultProps = {
    message: "CHANCELLOR NOMINATION",
    show: true
};

export default EventBar;