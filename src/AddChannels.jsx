import React, { useRef } from "react";

function AddChannels() {
  const fileInput = useRef(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const filereader = new FileReader();
    filereader.onload = (e) => {
      console.log(window.api.addChannelsfile(e.target.result));
    };
    filereader.readAsText(fileInput.current.files[0]);
  };

  return (
    <div>
      <h2>Add Channel</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="channelName">Channels file:</label>
          <input type="file" ref={fileInput} />
        </div>

        <button type="submit">Add Channels</button>
      </form>
    </div>
  );
}

export default AddChannels;
