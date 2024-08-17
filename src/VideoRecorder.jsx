import React, { useState, useRef, useEffect } from 'react';
import { saveAs } from 'file-saver';
import './VideoRecorder.css';

const questions = [
  {
    subject: 'Java',
    question: 'Your Interview will be started in a few seconds! Get ready',
    duration: 15,
  },
  {
    subject: 'Java',
    question: 'What are the main principles of Object-Oriented Programming in Java?',
    duration: 15,
  },
  {
    subject: 'Java',
    question: 'Can you explain the concept of exception handling in Java with an example?',
    duration: 15,
  },
  {
    subject: 'Java',
    question: 'Your Interview is completed Successfully! Thank you',
    duration: 5,
  },
];

const VideoRecorder = () => {
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const destinationRef = useRef(null);
  const synthRef = useRef(null);
  const canvasRef = useRef(null);

  const speakQuestion = (text) => {
    const synth = window.speechSynthesis;
    synthRef.current = synth;
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
  };

  const handleStartCaptureClick = async () => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (webcamRef.current) {
        webcamRef.current.srcObject = videoStream;
      }

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();
      destinationRef.current = destination;

      const userAudioSource = audioContext.createMediaStreamSource(videoStream);
      userAudioSource.connect(destination);

      // Create a canvas stream for capturing video with overlay
      const canvas = canvasRef.current;
      const canvasStream = canvas.captureStream();

      // Combine audio and video streams
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      mediaRecorderRef.current = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm',
      });

      mediaRecorderRef.current.ondataavailable = handleDataAvailable;
      mediaRecorderRef.current.start();

      setCapturing(true);
      setQuestionIndex(0);
      setTimer(0);
      setInterviewCompleted(false);

      // Start rendering the video frame with overlay
      renderFrame();

      mediaRecorderRef.current.onstop = () => {
        console.log('Recording stopped');
        if (questionIndex >= questions.length - 1) {
          setInterviewCompleted(true);
        }
      };
    } catch (err) {
      console.error('Error capturing video:', err);
    }
  };

  const renderFrame = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = webcamRef.current;

    const draw = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Draw the question overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.fillText(currentQuestion, 10, canvas.height - 30);

      requestAnimationFrame(draw);
    };

    draw();
  };

  const handleDataAvailable = ({ data }) => {
    if (data.size > 0) {
      setRecordedChunks((prev) => prev.concat(data));
    }
  };

  const handleStopCaptureClick = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }

    mediaRecorderRef.current.stop();
    setCapturing(false);
    setCurrentQuestion('');

    if (questionIndex >= questions.length - 1) {
      setInterviewCompleted(true);
    } else {
      setInterviewCompleted(false);
    }
  };

  const handleDownload = () => {
    if (recordedChunks.length) {
      const blob = new Blob(recordedChunks, {
        type: 'video/webm',
      });
      saveAs(blob, 'recorded-video-with-audio.webm');
      setRecordedChunks([]);
    }
  };

  useEffect(() => {
    if (capturing && questionIndex < questions.length) {
      const questionText = questions[questionIndex]?.question || '';
      setCurrentQuestion(questionText);
      if (questionText) {
        speakQuestion(questionText);
      }
    } else {
      setCurrentQuestion('');
    }
  }, [questionIndex, capturing]);

  useEffect(() => {
    if (capturing && questionIndex < questions.length) {
      let interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [capturing, questionIndex]);

  useEffect(() => {
    if (capturing) {
      if (timer >= questions[questionIndex]?.duration) {
        if (questionIndex < questions.length - 1) {
          setTimer(0);
          setQuestionIndex((prev) => prev + 1);
        } else {
          handleStopCaptureClick(); // Stop recording if it's the last question
        }
      }
    }
  }, [timer, questionIndex, capturing]);

  useEffect(() => {
    console.log('capturing:', capturing);
    console.log('questionIndex:', questionIndex);
    console.log('timer:', timer);
    console.log('interviewCompleted:', interviewCompleted);
    console.log('recordedChunks:', recordedChunks.length);
  }, [capturing, questionIndex, timer, interviewCompleted, recordedChunks]);

  return (
    <div className="video-recorder">
      <div className="controls">
        <button onClick={capturing ? handleStopCaptureClick : handleStartCaptureClick}>
          {capturing ? 'Stop Interview' : 'Start Interview'}
        </button>
      </div>
      <div className="video-frame">
        <video ref={webcamRef} autoPlay muted className="webcam-video" />
        <canvas ref={canvasRef} style={{ display: 'none' }} width="640" height="480" />
        {capturing && (
          <div className="overlay">
            {currentQuestion && <div className="question">{currentQuestion}</div>}
          </div>
        )}
      </div>
      {interviewCompleted && recordedChunks.length > 0 && (
        <button className="download-btn" onClick={handleDownload}>
          Download
        </button>
      )}
    </div>
  );
};

export default VideoRecorder;