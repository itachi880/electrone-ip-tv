import React, { useState, useEffect, useRef } from "react";
import { data as channelsStore, loadingbarstore } from "./data";
import "./channel.css";

function ChannelsList({ onClick = (e) => {}, hidedetails = false }) {
  const [search, setSearch] = useState("");
  const fileInputRef = useRef(null);

  // ✅ Keep global channels store, but use local state for displaying
  const [data, setData] = channelsStore.useStore();
  const [displayedChannels, setDisplayedChannels] = useState([]); // Don't modify the store directly

  const setLoading = loadingbarstore.useStore({ getter: false });

  const [offset, setOffset] = useState(0);
  const limit = 20;
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadChannels();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const loadChannels = async () => {
    if (!hasMore) return;

    setLoading({ loading: true });
    const newChannels = await window.api.getPaginatedChannels(limit, offset);

    if (newChannels.length === 0) {
      setHasMore(false);
    } else {
      setData({ channels: [...data.channels, ...newChannels] }); // ✅ Append to global store
      setDisplayedChannels([...displayedChannels, ...newChannels]); // ✅ Append to local display
      setOffset(offset + limit);
    }

    setLoading({ loading: false });
  };

  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      loadChannels();
    }
  };

  const searchChannels = async (query) => {
    setSearch(query);

    if (!query.trim()) {
      setDisplayedChannels(data.channels); // ✅ Reset to full list when search is empty
      return;
    }

    const localResults = data.channels.filter((channel) =>
      channel.name.toLowerCase().includes(query.toLowerCase())
    );

    if (localResults.length > 0) {
      setDisplayedChannels(localResults);
    } else {
      setLoading({ loading: true });
      const dbResults = await window.api.searchForChannelByName(query);
      setDisplayedChannels(dbResults);
      setLoading({ loading: false });
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current.click();
  };

  return (
    <div>
      <ul className="channel-list">
        <li className="channel speciale-input search-bar">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="Search channel"
            value={search}
            onChange={(e) => searchChannels(e.target.value)}
          />
        </li>

        <li className="channel speciale-input file-input">
          <button
            onClick={handleFileSelect}
            style={{
              background: "transparent",
              border: "none",
              padding: "10px",
              width: "100%",
              textAlign: "start",
            }}
          >
            + Upload Channels File
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="*.m3u , *.m3u8"
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;

              const fileReader = new FileReader();
              fileReader.onload = async (event) => {
                setLoading({ loading: true });
                const channels = await window.api.addChannelsfile(
                  event.target.result
                );
                const insert = await window.api.insertChannels(channels);

                if (insert.success) {
                  setData({ channels: [...data.channels, ...channels] });
                  setDisplayedChannels([...displayedChannels, ...channels]); // ✅ Update local display
                }
                setLoading({ loading: false });
              };
              fileReader.readAsText(file);
            }}
          />
        </li>

        {/* ✅ Use displayedChannels instead of modifying the global store */}
        {displayedChannels.map((e, index) => {
          if (hidedetails) {
            e.name = e.name
              .split(" ")
              .filter(
                (word) =>
                  !word.includes("(") &&
                  !word.includes("[") &&
                  !word.includes("{")
              )
              .join(" ");
          }
          return (
            <Channel
              key={index}
              name={e.name}
              number={index + 1}
              onClick={() => onClick(e)}
              state={e.state}
            />
          );
        })}

        {!hasMore && (
          <li className="channel no-more">No more channels to load</li>
        )}
      </ul>
    </div>
  );
}

const ChannelState = {
  OK: <i className="fa-solid fa-circle-check" style={{ color: "green" }}></i>,
  NO: <i className="fa-solid fa-circle-xmark" style={{ color: "red" }}></i>,
};

const Channel = ({ name, state, number, onClick }) => {
  return (
    <li className="channel" onClick={onClick}>
      {number + " : " + name}{" "}
      {ChannelState[state] || (
        <i
          className="fa-solid fa-circle-question"
          style={{ color: "yellow" }}
        ></i>
      )}
    </li>
  );
};

export default ChannelsList;
