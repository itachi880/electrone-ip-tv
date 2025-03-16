import React, { useEffect, useState } from "react";
import VideoPlayer from "./Player.jsx";
import { data as channelStore } from "./data/index.js";
import "./App.css"; // Import the App.css for global styles
import ChannelsList from "./ChannelsList.jsx";
import LoadingBar from "./Loader.jsx";
function App() {
  const [selectedChannel, setSelectedChannel] = useState({
    link: null,
    refferer: null,
  });
  const [data, setData] = channelStore.useStore();
  useEffect(() => {
    // window.api.getChannels().then((e) => {
    //   setData({ channels: e });
    // });
  }, []);
  return (
    <div className="app-container">
      <ChannelsList
        hidedetails={true}
        list={data.channels}
        onClick={(e) => {
          setSelectedChannel({
            link: e.link,
            refferer: e.referer,
          });
        }}
      />
      <VideoPlayer
        m3u8Url={selectedChannel.link}
        refferer={selectedChannel.refferer}
      />
      <LoadingBar />
    </div>
  );
}

export default App;
