# 牛来！云端闯关

一款使用 Three.js 和原生 JavaScript 制作的轻量第三人称 3D 闯关小游戏。操控黄金小牛穿过浮空草原、收集星星并抵达终点。

## 特点

- 真正的程序化 3D 角色网格，可从正面、侧面和背面观察
- 圆润黄金小牛造型：毛发凹凸、弯角、横耳、半眯眼、大口鼻、分趾手脚和尾巴
- 基于镜头方向的 WASD 移动、跳跃和第三人称镜头
- 浮岛跳跃、星星收集、坠落重生和终点判定
- 零构建步骤，全部依赖随仓库提供，可离线运行

## 本地运行

进入项目目录并启动任意静态文件服务器：

```powershell
python -m http.server 8137
```

打开 <http://127.0.0.1:8137/>。也可以直接双击 `index.html`。

## 操作

| 按键 | 功能 |
| --- | --- |
| W / A / S / D | 前进 / 左移 / 后退 / 右移 |
| 空格 | 跳跃 |
| 鼠标拖动 | 环绕镜头 |
| R | 重新开始 |

## 项目结构

```text
niulai/
├── index.html
├── js/platformer.js
├── vendor/three.min.js
├── LICENSE
└── .github/workflows/pages.yml
```

## 技术栈

- Three.js r147
- HTML5 / CSS3
- 原生 JavaScript

角色由 Three.js 基础曲面、胶囊、曲线管道和程序化材质实时构建，不依赖人物图片或外部 3D 模型。

## 开源许可

本项目采用 [MIT License](LICENSE)。Three.js 依照其自身 MIT 许可分发。
