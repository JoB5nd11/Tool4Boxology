# 🐳 Custom draw.io Docker Setup

This project is based on the [`fjudith/draw.io`](https://hub.docker.com/r/fjudith/draw.io) Docker image and extends it by adding custom shape libraries.

---

## 🚀 Getting Started

### 1. Run the container

To start the container:

```bash
docker-compose up
```

This will start draw.io and make the web app available at:

📍 [http://localhost:8080](http://localhost:8080)

---

### 2. Load Custom Libraries

Once the web app is running:

1. Click on **More Shapes** (bottom left of the draw.io editor).
2. Check the boxes for:
   - ✅ `PatternLib`
   - ✅ `ShapeLib`
3. Click **Apply**.
4. You will now see these libraries added to the **left sidebar**.

---

## 📁 Libraries Included

- `PatternLib` – pre-defined reusable graphical patterns
- `ShapeLib` – customized shapes useful for Boxology modeling

These are auto-mounted into the container at:
```
/usr/local/tomcat/webapps/draw/lib/
```

---

## 🛠 Notes

- All libraries are formatted in the proper `draw.io` format (`<mxlibrary>[{"xml":"..."}]</mxlibrary>`).
- Some are base64-encoded and zlib-compressed; others follow the `PatternLib` raw base64 format that draw.io also supports.
- This configuration ensures custom shapes appear seamlessly in the interface.

---

Enjoy diagramming! 🎨
