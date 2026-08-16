---
title: "开机自启docker后 开启或关闭自启容器"
slug: "开机自启docker后-开启或关闭自启容器"
date: "2022-01-09T17:39:05+08:00"
lastmod: "2022-01-09T17:39:05+08:00"
draft: false
summary: ""
description: ""
source:
  permalink: "/pages/73cd73/"
categories:
  - "工具与部署"
  - "docker"
tags:
  - "工具与部署"
  - "docker"
showToc: true
TocOpen: false
---
在docker启动容器可以增加参数来达到,当docker 服务重启之后 自动启动容器.

命令如下：
``` docker
docker run --restart=always
```

当然如果你的容器已经启动,可以通过update命令进行修改.
命令如下：
``` docker
docker update --restart=always <CONTAINER ID>
```
如果你想取消掉
命令如下:
``` docker
docker update --restart=no <CONTAINER ID>
```

