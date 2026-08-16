---
title: "linux小笔记"
slug: "linux小笔记"
date: "2021-10-08T19:46:04+08:00"
lastmod: "2021-10-08T19:46:04+08:00"
draft: false
summary: ""
description: ""
source:
  permalink: "/pages/0382d4/"
categories:
  - "linux"
tags:
  - "linux操作"
showToc: true
TocOpen: false
---
```
ps -eo pmem,pcpu,rss,vsize,args | sort -k 1 -r | less
执行以上命令可查看各个程序进程内存使用的内存情况，如下图所示，第一列为进程占用的内存百分比，可以看到哪些应用程序占的内存比较多，用于排查问题：
```

![img](https://img2018.cnblogs.com/blog/1158674/201903/1158674-20190319134154605-495483923.png)



