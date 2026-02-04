import React, { useState } from "react";
import Draggable from "react-draggable";
import "../styles/FloatingWidget.css"; // Ensure this file exists

const FloatingWidget = () => {
    const [open, setOpen] = useState(true);

    return (
        open && (
          <Draggable>
            <div className="floatingwidget">
              <button className="close-btn" onClick={() => setOpen(false)}>x</button>
              <p> AI Assistant Running...</p>
            </div>
          </Draggable>
        )
    );
};

export default FloatingWidget;