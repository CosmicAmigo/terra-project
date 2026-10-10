if (!window.hasScreenshotListener) {
  window.hasScreenshotListener = true;

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "SHOW_THUMBNAIL") {
      initScreenshotFlow(message.dataUrl, message.defaultFilename, message.sessionId);
    }
  });
}

function initScreenshotFlow(originalDataUrl, defaultFilename, sessionId) {
  const existing = document.getElementById("ss-thumb-container");
  if (existing) existing.remove();

  let isEditing = false;

  const thumbContainer = document.createElement("div");
  thumbContainer.id = "ss-thumb-container";
  Object.assign(thumbContainer.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "180px",
    height: "110px",
    zIndex: "99999999",
    borderRadius: "8px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    border: "2px solid #fff",
    overflow: "hidden",
    cursor: "pointer",
    background: "#000",
    transition: "opacity 0.3s"
  });

  const img = document.createElement("img");
  img.src = originalDataUrl;
  Object.assign(img.style, { width: "100%", height: "100%", objectFit: "cover" });
  thumbContainer.appendChild(img);
  document.body.appendChild(thumbContainer);

  setTimeout(() => {
    if (!isEditing && thumbContainer) {
      thumbContainer.style.opacity = "0";
      setTimeout(() => thumbContainer.remove(), 300);
    }
  }, 3200);

  thumbContainer.addEventListener("click", () => {
    isEditing = true;
    thumbContainer.remove();

    chrome.runtime.sendMessage({ action: "CANCEL_AUTO_DOWNLOAD", sessionId });

    openAdvancedEditor(originalDataUrl, defaultFilename, (editedDataUrl, chosenFilename, saveMode) => {
      if (saveMode === "SAVE_BOTH") {
        chrome.runtime.sendMessage({
          action: "MANUAL_DOWNLOAD",
          sessionId,
          dataUrl: originalDataUrl,
          filename: chosenFilename,
          suffix: "original"
        });
        setTimeout(() => {
          chrome.runtime.sendMessage({
            action: "MANUAL_DOWNLOAD",
            sessionId,
            dataUrl: editedDataUrl,
            filename: chosenFilename,
            suffix: "edited"
          });
        }, 300);
      } else {
        chrome.runtime.sendMessage({
          action: "MANUAL_DOWNLOAD",
          sessionId,
          dataUrl: editedDataUrl,
          filename: chosenFilename
        });
      }
    });
  });

  function openAdvancedEditor(imageSrc, initialFilename, onSaveCallback) {
    const modal = document.createElement("div");
    Object.assign(modal.style, {
      position: "fixed",
      top: "0", left: "0", width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.9)",
      zIndex: "999999999",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif"
    });

    let currentTool = "draw"; 
    let strokeColor = "#ff0055";
    const historyStack = [];

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    
    const mainImg = new Image();
    mainImg.src = imageSrc;

    mainImg.onload = () => {
      canvas.width = mainImg.width;
      canvas.height = mainImg.height;
      canvas.style.maxWidth = "80vw";
      canvas.style.maxHeight = "65vh";
      canvas.style.border = "1px solid #444";
      ctx.drawImage(mainImg, 0, 0);
      saveState();
    };

    function saveState() {
      historyStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }

    function undo() {
      if (historyStack.length > 1) {
        historyStack.pop();
        const prevState = historyStack[historyStack.length - 1];
        canvas.width = prevState.width;
        canvas.height = prevState.height;
        ctx.putImageData(prevState, 0, 0);
      }
    }

    const handleKeyDown = (e) => {
      if (document.activeElement === filenameInput) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // Toolbar
    const toolbar = document.createElement("div");
    Object.assign(toolbar.style, {
      display: "flex",
      gap: "8px",
      marginBottom: "12px",
      background: "#1e1e1e",
      padding: "8px 16px",
      borderRadius: "8px",
      color: "#fff",
      alignItems: "center"
    });

    const toolButtons = {};

    function createToolBtn(toolName, label, onClick) {
      const b = document.createElement("button");
      b.innerText = label;
      Object.assign(b.style, {
        padding: "6px 12px",
        background: "#333",
        color: "#fff",
        border: "1px solid #555",
        borderRadius: "4px",
        cursor: "pointer",
        fontWeight: "500",
        transition: "background 0.15s, border-color 0.15s"
      });

      b.onclick = (e) => {
        e.stopPropagation();
        if (toolName) {
          currentTool = toolName;
          updateToolSelection();
        }
        onClick();
      };

      if (toolName) toolButtons[toolName] = b;
      return b;
    }

    function updateToolSelection() {
      Object.keys(toolButtons).forEach((key) => {
        if (key === currentTool) {
          toolButtons[key].style.background = "#2563eb";
          toolButtons[key].style.borderColor = "#60a5fa";
        } else {
          toolButtons[key].style.background = "#333";
          toolButtons[key].style.borderColor = "#555";
        }
      });
    }

    const drawBtn = createToolBtn("draw", "Draw", () => {});
    const rubberBtn = createToolBtn("rubber", "Rubber", () => {});
    const rectBtn = createToolBtn("rect", "Rectangle", () => {});
    const circleBtn = createToolBtn("circle", "Circle", () => {});
    const cropBtn = createToolBtn("crop", "Crop", () => {});

    const rotateBtn = createToolBtn(null, "Rotate", () => {
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
      
      tempCanvas.width = canvas.height;
      tempCanvas.height = canvas.width;
      
      tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
      tempCtx.rotate((90 * Math.PI) / 180);
      tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
      
      canvas.width = tempCanvas.width;
      canvas.height = tempCanvas.height;
      ctx.drawImage(tempCanvas, 0, 0);
      saveState();
    });

    const undoBtn = createToolBtn(null, "Undo", () => undo());
    undoBtn.style.background = "#4b5563";

    toolbar.append(drawBtn, rubberBtn, rectBtn, circleBtn, cropBtn, rotateBtn, undoBtn);
    updateToolSelection();

    // Actionbar & Filename Input
    const actionbar = document.createElement("div");
    Object.assign(actionbar.style, {
      display: "flex",
      gap: "10px",
      marginTop: "12px",
      alignItems: "center"
    });

    const nameLabel = document.createElement("span");
    nameLabel.innerText = "File Name:";
    nameLabel.style.color = "#ccc";
    nameLabel.style.fontSize = "13px";

    const filenameInput = document.createElement("input");
    filenameInput.type = "text";
    filenameInput.value = initialFilename;
    Object.assign(filenameInput.style, {
      padding: "6px 10px",
      background: "#1e1e1e",
      color: "#fff",
      border: "1px solid #555",
      borderRadius: "4px",
      fontSize: "13px",
      width: "280px"
    });

    filenameInput.addEventListener("click", (e) => e.stopPropagation());

    let isClosed = false;
    function finalize(saveMode = "SINGLE") {
      if (isClosed) return;
      isClosed = true;
      window.removeEventListener("keydown", handleKeyDown);
      const editedResult = canvas.toDataURL("image/png");
      const chosenName = filenameInput.value || initialFilename;
      modal.remove();
      onSaveCallback(editedResult, chosenName, saveMode);
    }

    const saveCopyBtn = createToolBtn(null, "Save Copy (Both)", () => finalize("SAVE_BOTH"));
    saveCopyBtn.style.background = "#059669";
    saveCopyBtn.style.borderColor = "#10b981";

    const doneBtn = createToolBtn(null, "Done Editing", () => finalize("SINGLE"));
    doneBtn.style.background = "#2563eb";
    doneBtn.style.borderColor = "#3b82f6";

    actionbar.append(nameLabel, filenameInput, saveCopyBtn, doneBtn);

    // Canvas drawing logic
    let isDrawing = false;
    let startX = 0, startY = 0;
    let snapshot = null;

    canvas.addEventListener("mousedown", (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      startX = (e.clientX - rect.left) * scaleX;
      startY = (e.clientY - rect.top) * scaleY;

      snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
    });

    canvas.addEventListener("mousemove", (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const currentX = (e.clientX - rect.left) * scaleX;
      const currentY = (e.clientY - rect.top) * scaleY;

      if (currentTool === "draw") {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 4;
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
      } else if (currentTool === "rubber") {
        ctx.clearRect(currentX - 15, currentY - 15, 30, 30);
      } else if (currentTool === "rect") {
        ctx.putImageData(snapshot, 0, 0);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
      } else if (currentTool === "circle") {
        ctx.putImageData(snapshot, 0, 0);
        ctx.beginPath();
        let radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 4;
        ctx.stroke();
      } else if (currentTool === "crop") {
        ctx.putImageData(snapshot, 0, 0);
        ctx.strokeStyle = "#fff";
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
        ctx.setLineDash([]);
      }
    });

    canvas.addEventListener("mouseup", (e) => {
      if (!isDrawing) return;
      isDrawing = false;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const endX = (e.clientX - rect.left) * scaleX;
      const endY = (e.clientY - rect.top) * scaleY;

      if (currentTool === "crop") {
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);
        const cropX = Math.min(startX, endX);
        const cropY = Math.min(startY, endY);

        if (width > 10 && height > 10) {
          const croppedData = ctx.getImageData(cropX, cropY, width, height);
          canvas.width = width;
          canvas.height = height;
          ctx.putImageData(croppedData, 0, 0);
        }
      }

      saveState();
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        finalize("SINGLE");
      }
    });

    modal.appendChild(toolbar);
    modal.appendChild(canvas);
    modal.appendChild(actionbar);
    document.body.appendChild(modal);
  }
}