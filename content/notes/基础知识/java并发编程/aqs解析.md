---
title: "AQS解析"
slug: "aqs解析"
date: "2021-06-03T13:42:07+08:00"
lastmod: "2021-06-03T13:42:07+08:00"
draft: false
summary: ""
description: ""
source:
  permalink: "/pages/357f9d/"
categories:
  - "java"
  - "并发编程"
tags:
  - "java并发编程"
  - "Java"
  - "并发"
showToc: true
TocOpen: false
---
> AQS一直是我多线程上不可逾越的鸿沟，每当拿起《Java并发编程艺术》看到这里就会呼呼大睡😢,这次专门做个记录，后面复习用。

![概览](https://img.ggball.top/picGo/20230604173417.png)


## 什么是AQS
AQS（AbstractQueuedSynchronizer）是Java并发包（java.util.concurrent）中提供的一个抽象类，它提供了一种实现同步器（Synchronizer）的框架。

**主要功能：**
提供同步状态的管理功能，子类通过获取同步状态来达到线程同步的目的

**主要结构：**
使用了一个 int 成员变量表示同步状态，AQS依赖双向链表，每个节点包含了线程和等待状态等信息，当线程获取同步状态失败时，会将线程和等待信息封装成一个节点，并存放到链表尾部；当首节点被释放时，会通知它的后继节点获取同步状态。

**主要方法：**

同步器提供的模板方法基本上分为 3 类：
1. 独占式获取与释放同步状态。
2. 共享式获取与释放同步状态。   
3. 查询同步队列中的等待线程情况。


![可重写方法](https://img.ggball.top/picGo/20230604144845.png)

![模板方法](https://img.ggball.top/picGo/20230604144914.png)


> 注意：
> synchronized是JVM层面的，AQS是java代码层面的
> 使用synchronized关键字会有两个缺点：
> 1.非公平锁造成锁饥饿；
> 2.当线程释放锁时，需要通知同步队列中所有线程使其变为准备状态。
> 而AQS利用双向链表，实现公平锁，不会造成锁饥饿，每个线程只看自己的前驱节点的锁状态，当锁释放时，只会通知后继节点，减少cpu的开销。

## 利用AQS,简单实现独占锁

上面稍微了解下AQS的概念，先主要看下利用AQS简单实现独占锁，可以更好的了解AQS原理

```java
/**
 * 自定义锁 实现lock接口
 */
public class SelfLock implements Lock {


    /**
     * 创建一个自定义同步器
     */
    private static class Sync extends AbstractQueuedSynchronizer {

        /**
         * 尝试获取同步状态，获取成功返回true，否则返回false
         *
         * @param arg the acquire argument. This value is always the one
         *            passed to an acquire method, or is the value saved on entry
         *            to a condition wait.  The value is otherwise uninterpreted
         *            and can represent anything you like.
         * @return
         */
        @Override
        protected boolean tryAcquire(int arg) {

            // 如果第一个线程进来，期待值是0，设置成1，设置成功，可以返回true
            if (compareAndSetState(0, arg)) {
                setExclusiveOwnerThread(Thread.currentThread());
                return true;
            }
            return false;
        }

        /**
         * 尝试释放同步状态，释放成功返回true，否则返回false
         * @param arg the release argument. This value is always the one
         *        passed to a release method, or the current state value upon
         *        entry to a condition wait.  The value is otherwise
         *        uninterpreted and can represent anything you like.
         * @return
         */
        @Override
        protected boolean tryRelease(int arg) {
            if (getState() == arg) {
                throw new IllegalMonitorStateException();
            }
            setExclusiveOwnerThread(null);
            setState(arg);
            return true;
        }

        /**
         * 创建一个condition，类似于wait和notify
         * @return
         */
        public Condition newCondition() {
            return new ConditionObject();
        }
    }



    /**
     * 创建一个私有的，不可变的同步器
     */
    private final Sync sync = new Sync();

    /**
     * 加锁操作
     */
    @Override
    public void lock() {
        sync.acquire(1);
    }

    /**
     * 加锁操作，可中断
     * @throws InterruptedException
     */
    @Override
    public void lockInterruptibly() throws InterruptedException {
        sync.acquireInterruptibly(1);
    }

    /**
     * 尝试加锁，不成功返回false
     * @return
     */
    @Override
    public boolean tryLock() {
        return sync.tryAcquire(1);
    }

    /**
     * 尝试加锁，带超时时间
     * @param time the maximum time to wait for the lock
     * @param unit the time unit of the {@code time} argument
     * @return
     * @throws InterruptedException
     */
    @Override
    public boolean tryLock(long time, TimeUnit unit) throws InterruptedException {
        return sync.tryAcquireNanos(1, unit.toNanos(time));
    }

    /**
     * 解锁操作
     */
    @Override
    public void unlock() {
        sync.release(0);
    }

    /**
     * 创建一个condition，类似于wait和notify
     */
    @Override
    public Condition newCondition() {
        return sync.newCondition();
    }
}


```
创建一个静态的私用`Sync`类，继承`AbstractQueuedSynchronizer `实现同步器方法。自定义的`SelfLock `实现`Lock`接口，`Lock`接口的方法都由同步器的方法实现。
就拿`tryLock`方法举例，内部由`Sync`类的`tryAcquire`实现，`tryAcquire`方法实现原理是利用`cas`获取同步器的同步状态，获取成功则加锁成功，设置当前信息，反之则失败。
> 这里使用到了模板模式，当Lock子类实现好后，基本不需要改动，如果需要修改加锁逻辑，也只是修改同步器子类的方法。


测试方法
```java
public class SelfLockTest {
    static Lock lock = new SelfLock();
    public static void main(String[] args) throws InterruptedException {
        Thread A = new Thread(() -> {
            testLock();
        });
        Thread B = new Thread(() -> {
            testLock();
        });
        A.setName("I am A");
        B.setName("I am B");
        A.start();
        Thread.sleep(100);
        B.start();
    }
    public static void testLock() {
        System.out.println("I want IN。。。。");
        lock.lock();
        try {
            System.out.println("我获取到锁了，哈哈！线程名称 = "
                    + Thread.currentThread().getName());
            while (true) {

            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            lock.unlock();
        }
    }
}

```

## AQS原理

### 利用同步队列实现线程间的同步

刚刚上面只是简单使用AQS实现了一个同步器，用来达到线程同步的目的。那AQS如何利用同步队列实现线程之间如何同步的呢？需要再分析下

![同步队列结构图](https://img.ggball.top/picGo/20230604151956.png)

![node节点信息](https://img.ggball.top/picGo/20230604153515.png)


就拿`acquire`方法举例把
```java
    public final void acquire(int arg) {
        if (!tryAcquire(arg) &&
            acquireQueued(addWaiter(Node.EXCLUSIVE), arg))
            selfInterrupt();
    }

```

1. 首先线程会尝试获取同步状态，也就是state,如果获取成功，直接返回，如果获取同步状态失败，进入下一步（对应方法`tryAcquire`）
2. 将线程信息和锁状态信息封装成node节点，也是利用cas加入双向链表尾部，（对应方法`addWaiter`）成为尾节点成功后，节点内部会判断前驱节点是否时头节点，如果是则尝试获取同步状态（对应方法`acquireQueued`），如果不是则阻塞该线程。
3. 当头节点释放锁时，后继节点会尝试获取同步状态，如果成功，则将自己设置成头节点。对应方法`acquireQueued`）





### 释放锁

```java
    public final boolean release(int arg) {
        if (tryRelease(arg)) {
            Node h = head;
            if (h != null && h.waitStatus != 0)
                unparkSuccessor(h);
            return true;
        }
        return false;
    }
```
先尝试释放锁，如果满足条件，则返回true，主要调用了LockSupport.unpark 唤醒阻塞状态的线程。
需要了解 LockSupport 
![LockSupport方法](https://img.ggball.top/picGo/20230604160952.png)


## Condition

结构由先进先出队列构成

### await

```java
            if (Thread.interrupted())
                throw new InterruptedException();
            Node node = addConditionWaiter();
            long savedState = fullyRelease(node);
```

解释：支持响应中断，构建一个节点，加入到等待队列中，释放锁（修改同步状态）


### signal

```java
        public final void signal() {
            if (!isHeldExclusively())
                throw new IllegalMonitorStateException();
            Node first = firstWaiter;
            if (first != null)
                doSignal(first);
        }
```

解释：判断当前线程是否拥有独占锁，将等待队列中的头节点唤醒，（利用enq方法将节点移到同步队列中，使用LockSupport工具将其唤醒）

## 总结
总的来说，AQS和synchronized关键字很类似，都是有同步队列和等待队列，利用同步队列实现线程的同步，等待队列实现等待/通知机制（AQS的等待队列是由Condition体现的，下次介绍），AQS的优点是：
1. 加锁和释放锁更加灵活，可设置超时时间，也可以设置成可中断加锁
2. AQS可以自由实现公平锁和非公平锁。
3. AQS底层都是利用cas设置值，避免了线程用户态到内核态之间的转换，减少CPU卡顿

