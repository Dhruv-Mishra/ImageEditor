
STACK
Next.js, React, TypeScript (preferred), Tailwind CSS


DELIVERABLE
Working app: upload photo → AI crop suggestion → interactive crop → export


1. Overview
You will build a single-page Next.js application that lets a user upload a portrait photo, receive an AI-generated suggestion for the optimal headshot crop zone, and then interactively adjust the crop before exporting the final image.

2. Functional Requirements


2.1  Photo Upload
Implement a drag-and-drop upload zone with a fallback file picker button.
Accept common image formats: JPEG, PNG, and WebP.
Show a thumbnail preview immediately after a file is selected.
Validate file type and size AND if it is indeed a portrait photo of a human (max 10 MB) with clear, inline error messages.
2.2  AI Crop Suggestion
After the image is loaded, the app should display a suggested crop rectangle representing the optimal headshot region.

Write a deterministic function that analyses the image dimensions and returns a centered crop rectangle with a standard headshot aspect ratio (e.g., 3:4 or 4:5).
Use a simple heuristic: place the crop in the upper-center third of the image (where a face is most likely to be).
The suggestion should be visually rendered as an overlay on the uploaded image so the user can see what the AI recommends before making adjustments.

2.3  Interactive Crop Editor
Display the uploaded image with the AI-suggested crop zone overlaid as a resizable, draggable rectangle.
The crop overlay should be visually distinct: semi-transparent shading outside the crop area with a clear bounding box.
Allow the user to resize the crop from corners and edges.
Allow the user to drag/reposition the crop freely.
Provide a “Reset to AI Suggestion” button that snaps back to the original recommendation.
Optionally lock aspect ratio via a toggle (e.g., 1:1, 3:4, 4:5, free).

2.4  Export
A “Export Cropped Image” button that uses the HTML Canvas API (or equivalent) to crop the image client-side.
Trigger a browser download of the cropped result as a JPEG or PNG.
Show a brief success toast or confirmation after export.

3. Non-Functional Requirements


Responsive layout: the editor should be usable on both desktop (primary) and tablet-width screen and a mobile screen as well. 
Accessibility: all interactive elements should be keyboard-navigable and have appropriate ARIA labels.
Performance: image rendering and crop interactions should feel instantaneous (60 fps target).
Code quality: clean component architecture, sensible file structure, and meaningful variable names.
TypeScript is preferred but not mandatory. If you use JavaScript, PropTypes or JSDoc annotations are appreciated.
