// Load the OpenCV.js library
const script = document.createElement('script');
script.src = 'https://docs.opencv.org/master/opencv.js';
script.async = true;
script.onload = start;
document.head.appendChild(script);

function start() {
  // Create a canvas element to display the video and detected lanes
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Get the video element
  const video = document.getElementById('video');

  // Set up the video stream
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
      video.play();
    })
    .catch(err => console.error(err));

  // Process each frame of the video
  function processFrame() {
    // Capture the current frame from the video
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert the frame to grayscale
    const src = cv.imread(canvas);
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Apply Gaussian blur to reduce noise
    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // Apply Canny edge detection
    const edges = new cv.Mat();
    cv.Canny(blurred, edges, 50, 150);

    // Define the region of interest (ROI)
    const roi = new cv.Mat(edges.rows, edges.cols, cv.CV_8UC1, new cv.Scalar(0));
    const vertices = [
      new cv.Point(0, edges.rows),
      new cv.Point(edges.cols / 2, edges.rows / 2),
      new cv.Point(edges.cols, edges.rows)
    ];
    const pts = new cv.Mat(vertices.length, 1, cv.CV_32SC2);
    for (let i = 0; i < vertices.length; i++) {
      pts.data32S[i * 2] = vertices[i].x;
      pts.data32S[i * 2 + 1] = vertices[i].y;
    }
    cv.fillPoly(roi, [pts], new cv.Scalar(255));

    // Apply bitwise AND to extract the ROI
    const masked = new cv.Mat();
    cv.bitwiseAnd(edges, roi, masked);

    // Detect lines using Hough transform
    const lines = new cv.Mat();
    cv.HoughLinesP(masked, lines, 1, Math.PI / 180, 50, 30, 10);

    // Draw the detected lines on the canvas
    for (let i = 0; i < lines.rows; i++) {
      const line = lines.data32S.subarray(i * 4, i * 4 + 4);
      cv.line(src, new cv.Point(line[0], line[1]), new cv.Point(line[2], line[3]), new cv.Scalar(255, 0, 0), 2);
    }

    // Display the processed frame
    cv.imshow(canvas, src);

    // Release memory
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    roi.delete();
    pts.delete();
    masked.delete();
    lines.delete();

    // Request the next frame
    requestAnimationFrame(processFrame);
  }

  // Start processing frames
  video.addEventListener('loadedmetadata', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    requestAnimationFrame(processFrame);
  });
}