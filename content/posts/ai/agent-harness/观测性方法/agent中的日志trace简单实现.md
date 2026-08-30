---
title: "agent中的日志trace简单实现"
slug: "agent中的日志trace简单实现"
date: "2026-08-30T13:49:11+08:00"
lastmod: "2026-08-30T13:49:11+08:00"
draft: false
summary: ""
description: ""
categories:
  - "工具与部署"
tags: []
showToc: true
TocOpen: false
---
![Agent trace 简单实现示意图|621](https://img.ggball.top/blog/2026/08/01-flowchart-trace-overview.png)
在 agent 项目当中，引入 trace 还是很重要的。这里说的 trace，就是日志链路。它可以方便我们知道哪里执行得慢、执行了多长时间，也方便排查和优化问题。

如果要简单实现链路追踪，可以在上下文中引用一个 span。span 相当于一个监控组件，里面可以加入锁和它的子 span。这个组件需要有一个开始记录的方法。

那么，怎么实现一个简单的日志链路？可以在 span 里面加入一个 start 方法。默认情况下，start 方法会创建一个子 span，并加入到父 span 里面去，相当于把子节点加入到父节点，同时存到上下文中。这样就可以在需要调用的地方维护上下级关系。



![image.png](https://img.ggball.top/blog/2026/08/20260830134120316.png)

比如，我们可以在以下位置进行操作：在 Agent 的不同阶段加入 start span 和 end span 方法。

1. 整体流程：在 Agent 启动的地方加入 start span 方法作为 root span；当 Agent 结束之后，调用 end span，计算出 Agent 整个流程消耗了多长时间。
2. 单次 Turn：在 loop 循环中，每一次调用 turn 的前后加入 start 和 end 方法，这样也能计算出一次 turn 所用的时间。
3. 其他环节：也可以在工具调用、思考模式等环节加入类似的方法。

通过这些埋点，我们可以得到以下效果：

1. 耗时可视化：生成一张类似树状图的数据，可以很好地观测到 Agent 在每一步的耗时。
2. 业务数据记录：不仅能记录时间，还可以在 span 组件里面加上一个 map，用来存上自己想要的数据（比如业务数据）。
3. 信息打印：最后再实现一个 print 方法，把每个节点的记录信息打印出来。

![](https://img.ggball.top/blog/2026/08/20260830143507528.png)
