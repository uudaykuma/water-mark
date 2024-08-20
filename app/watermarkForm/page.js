'use client'; // Ensure this is a Client Component

import { useState } from 'react';

export default function WatermarkForm() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [type, setType] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    const fileType = selectedFile.type.split('/')[1];
    setType(fileType);
  };

  const handleUpload = async () => {
    if (!file || !text) {
      return alert("Please select a file and enter watermark text");
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64File = reader.result.split(',')[1];

      try {
        const response = await fetch('/api/watermark', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file: base64File,
            text,
            type,
          }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `watermarked.${type}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          alert('Failed to add watermark');
        }
      } catch (error) {
        console.error('Error during file upload:', error);
        alert('Failed to add watermark due to a server error.');
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input type="file" accept="image/*,.pdf" onChange={handleFileChange} />
      <input
        type="text"
        placeholder="Watermark text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button onClick={handleUpload}>Upload and Watermark</button>
    </div>
  );
}
