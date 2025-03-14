import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import "./Player.css";

const VideoPlayer = ({ m3u8Url, refferer }) => {
  /**
   * @type {Record<"current",HTMLVideoElement>}
   */
  const videoRef = useRef(null);
  const [qualities, setQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [IsPlayed, setIsPlayed] = useState(false);
  const [IsLive, setIsLive] = useState(false);
  const [showSettings, setShowsettings] = useState(false);
  const [volume, setVolume] = useState(1);
  /**
   * @type {Record<"current",HTMLDivElement>}
   */
  const PlayerRef = useRef(null);
  let lastDurration = 0;
  const hlsRef = useRef(null);

  useEffect(() => {
    if (!m3u8Url) return;
    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr, url) => {
          if (refferer) {
            xhr.setRequestHeader("from", refferer);
          }
        },
      });

      hlsRef.current = hls; // Store the instance for later use

      // When the manifest is parsed, get available qualities
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        setQualities(data.levels); // Save available qualities in state
        setSelectedQuality(data.levels.length - 1); // Default to highest quality
      });

      // Attach the HLS.js player to the video element
      hls.loadSource(m3u8Url);
      hls.attachMedia(videoRef.current);

      // Clean up when the component is unmounted
      return () => {
        hls.destroy();
      };
    } else {
      console.error("HLS.js is not supported in this browser.");
    }
  }, [m3u8Url]); // Only trigger this effect on m3u8Url change

  useEffect(() => {
    if (hlsRef.current && selectedQuality !== null) {
      hlsRef.current.startLevel = selectedQuality; // Update HLS player quality
    }
  }, [selectedQuality]);
  useEffect(() => {
    if (!videoRef.current) return;
    const liveStateHandler = () => {
      if (lastDurration > videoRef.current.currentTime) setIsLive(false);
      lastDurration = videoRef.current.currentTime;
    };
    const onLoad = () => {
      videoRef.current
        .play()
        .then(() => {
          setIsPlayed(true);
        })
        .catch(() => {
          setIsPlayed(false);
        });
    };
    videoRef.current.addEventListener("loadeddata", onLoad);
    videoRef.current.addEventListener("timeupdate", liveStateHandler);
    return () => {
      videoRef.current.removeEventListener("timeupdate", liveStateHandler);
      videoRef.current.removeEventListener("loadeddata", onLoad);
    };
  }, [videoRef]);

  const handleQualityChange = (event) => {
    const newQuality = parseInt(event.target.value, 10);
    setSelectedQuality(newQuality); // Update selected quality
  };
  const handleVolumeChange = (event) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    if (videoRef.current) videoRef.current.volume = newVolume;
  };

  return (
    <div className="video-player" ref={PlayerRef}>
      <video ref={videoRef} className="video-element" />
      <div className="controles">
        <ProgressBar videoRef={videoRef} />
        <div className="btns">
          <div className="left">
            <button
              onClick={() => {
                setIsLive(true);
                if (!videoRef.current) return;
                videoRef.current.currentTime = videoRef.current.duration - 10;
              }}
            >
              LIVE{" "}
              <i
                className={"fa-solid fa-circle" + (IsLive ? " active" : "")}
              ></i>
            </button>
          </div>
          <div className="center">
            <button
              onClick={() => {
                if (!videoRef.current) return;
                videoRef.current.currentTime -= 10;
              }}
            >
              <i className="fa-solid fa-backward"></i>
            </button>
            <button
              onClick={() => {
                console.log(qualities);
                if (!videoRef.current) return setIsPlayed(false);
                if (IsPlayed) {
                  videoRef.current.pause();
                } else {
                  videoRef.current.play();
                }
                setIsPlayed((prev) => !prev);
              }}
            >
              {IsPlayed ? (
                <i className="fa-solid fa-circle-pause"></i>
              ) : (
                <i className="fa-solid fa-circle-play"></i>
              )}
            </button>
            <button
              onClick={() => {
                if (!videoRef.current) return;
                if (
                  videoRef.current.currentTime + 10 >=
                  videoRef.current.duration - 20
                )
                  return;

                videoRef.current.currentTime += 10;
              }}
            >
              <i className="fa-solid fa-forward"></i>
            </button>
          </div>
          <div className="rigth">
            <button onClick={() => setShowsettings((prev) => !prev)}>
              <i className="fa-solid fa-gear"></i>
            </button>
            <button
              onClick={() => {
                if (
                  !document.fullscreenElement &&
                  PlayerRef.current.requestFullscreen
                ) {
                  PlayerRef.current
                    .requestFullscreen()
                    .catch((err) => console.error(err));
                } else if (document.exitFullscreen) {
                  document.exitFullscreen().catch((err) => console.error(err));
                } else if (document.webkitExitFullscreen) {
                  // Safari support
                  document.webkitExitFullscreen();
                }
              }}
            >
              <i className="fa-solid fa-up-right-and-down-left-from-center"></i>
            </button>
            {showSettings && (
              <Settings
                qualities={qualities}
                selectedQuality={selectedQuality}
                onQualityChange={handleQualityChange}
                volume={volume}
                onVolumeChange={handleVolumeChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
const Settings = ({
  qualities,
  selectedQuality,
  onQualityChange,
  volume,
  onVolumeChange,
}) => {
  return (
    <div className="settings-menu">
      <h3>Settings</h3>
      <div className="setting-item">
        <label>Quality:</label>
        <select value={selectedQuality} onChange={onQualityChange}>
          {qualities.map((quality, index) => (
            <option key={index} value={index}>
              {quality.height}p{" "}
              {`(${
                quality.bitrate / 1024 >= 1000
                  ? (quality.bitrate / 1024 / 1024).toFixed(2) + " Mbit/s"
                  : (quality.bitrate / 1024).toFixed(2) + " Kbit/s"
              })`}
            </option>
          ))}
        </select>
      </div>
      <div className="setting-item">
        <label>Volume: </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={onVolumeChange}
        />
      </div>
    </div>
  );
};
/**
 *
 * @param {object} param0
 * @param {Record<"current",HTMLVideoElement>} param0.videoRef
 * @returns
 */
const ProgressBar = ({ videoRef }) => {
  const [Progress, setProgress] = useState(0);
  const [Duration, setDuration] = useState(0);
  useEffect(() => {
    const handleProgress = () => {
      if (!videoRef.current) return;
      const time = videoRef.current.currentTime;
      setProgress(time);
    };
    const HandleDurationChange = () => {
      if (!videoRef.current) return;
      const time = videoRef.current.duration;

      setDuration(time);
    };
    videoRef.current.addEventListener("timeupdate", handleProgress);
    videoRef.current.addEventListener("durationchange", HandleDurationChange);
    return () => {
      videoRef.current.removeEventListener("timeupdate", handleProgress);
      videoRef.current.removeEventListener(
        "durationchange",
        HandleDurationChange
      );
    };
  }, [videoRef]);

  return (
    <div
      className="progress-bar"
      onClick={(e) => {
        const userBarClickPositionPercent =
          ((e.clientX - e.currentTarget.getBoundingClientRect().left) /
            e.currentTarget.getBoundingClientRect().width) *
          100;
        /**
         * w=(p/d)*100
         * p=(w/100)*d
         */

        videoRef.current.currentTime =
          Duration * (userBarClickPositionPercent / 100);
        setProgress(Duration * (userBarClickPositionPercent / 100));
      }}
    >
      <div
        className="bar"
        style={{ width: ((Progress / Duration) * 100).toFixed(3) + "%" }}
      ></div>
    </div>
  );
};

export default VideoPlayer;
