# 背景

某一天在一个技术群里，看见一个大佬说写了个程序每天定时给女朋友发电子邮件，突然想到，我也可以写这样一个程序每天给女朋友定时发纪念日提醒及天气提醒，于是向那个大佬要了他写的程序源码，在空余时间，我自己也动手实践了一下。

# 实现过程

## 前提知识储备

- node 相关知识
- axios 库的使用
- nodemailer 库的使用
- Promise 知识
- window 开启定时执行脚本任务

## 结构目录

```markdown
├── config.js         #项目配置
├── daily-email.js    #代码程序文件
├── public            #后期会把每天生成的数据放到excel表格中查看
├── template.html     #测试生成模板页面使用
├── timing-task.bat   #定时执行程序bat
```

## 编写静态页面

![image.png](https://cdn.nlark.com/yuque/0/2022/png/2727826/1646116657374-e42d8b3c-d70b-474d-afb4-f89148a99b54.png#clientId=u9cac4c95-743c-4&crop=0&crop=0&crop=1&crop=1&from=paste&height=346&id=u935aacca&margin=%5Bobject%20Object%5D&name=image.png&originHeight=691&originWidth=1855&originalType=binary&ratio=1&rotation=0&showTitle=false&size=1856616&status=done&style=none&taskId=ubb721331-e6f9-4208-a7cf-8215f60aaf3&title=&width=927.5)

```html
<style>
    .container {
      background-color: rgb(165, 115, 140);
      background: url("http://cn.bing.com/th?id=OHR.GreatTits_ZH-CN0546267922_1920x1080.jpg&rf=LaDigue_1920x1080.jpg&pid=hp") center no-repeat;
      background-size: 100%;
      width: 960px;
      height: 540px;
      display: flex;
      justify-content: space-between;
      flex-direction: column;
      align-items: center;
      color: white;
    }

    .title {
      font-size: 22px;
      margin-top: 50px;
    }

    .description {
      color: white;
    }

    .content {
      background: rgba(255, 255, 255, 0.5);
      margin: 0 auto;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      padding: 20px;
      box-sizing: border-box;
    }

    .content>p {
      text-align: left;
      font-size: 12px;
      color: white;
      width: 100%;
      margin: 5px auto;
      padding: 0;
    }
  </style>


<div class="container">
    <div class="title">陪你一起看世界:第1162期</div>
    <a class="description" target="_blank" href="https://www.bing.com/search?q=%E5%A4%A7%E5%B1%B1%E9%9B%80&amp;form=hpcapt&amp;mkt=zh-cn" rel="noopener">冬天树枝上的大山雀，法国 (© Eric Ferry/Alamy)</a>
    <div class="content">
      <p style="display: flex;">
        <span>😘今天是：<span style="border-bottom: 1px dashed rgb(204, 204, 204); --darkreader-inline-border-bottom:#3e4446;" t="5" times="" data-darkreader-inline-border-bottom="">2022/2/18</span>，星期五，是我们在一起的第: 1162天~🥰🎈🎈🎈，今天天气: 多云 最高温 18℃，最低温 10℃，今天的风向是:东风。❤❤❤
        </span>
      </p>
      <p></p>
      <p>I love three things in this world.
        Sun,Moon and You.
        Sun for morning,Moon for night,
        and You forever.</p>
    </div>
  </div>
```

## 获取每日的 bing 壁纸

```javascript
const fetchBingPictrue = async () => {
  const BPicList = await axios.get("https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1")
  let bingInfo = {}
  if (!BPicList.images[0]) {
    console.error("获取bing壁纸失败")
    return bingInfo
  }
  bingInfo.picUrl = `http://cn.bing.com${BPicList.images[0].url}`
  bingInfo.copyright = BPicList.images[0].copyright
  bingInfo.copyrightlink = BPicList.images[0].copyrightlink
  console.log('🚀【获取到的bing壁纸信息】', bingInfo);
  return bingInfo
}
```

## 获取天气信息

```javascript
const fetchWeaterByCity = async () => {
  let weather = await axios.get(
    `http://wthrcdn.etouch.cn/weather_mini?city=广州`,
  );
  if (weather.data.forecast.length === 0) {
    console.error("获取今日天气失败")
    return {}
  }
  console.log('🚀【获取到天气信息】', weather.data.forecast[0]);
  return weather.data.forecast[0]
}
```

## 获取每日一句土味情话

```javascript
const fetchSentence = async () => {
  const sentence = await axios.get(`https://chp.shadiao.app/api.php`);
  console.log('🚀【获取到每日一句】', sentence);
  return sentence
}
```

## 获取到数据到生成HTML

```javascript
/**
 * @description: 设置email的内容
 * @return {*}
 * @param {*} bingInfo bing的信息，包含图片及文字描述和链接
 * @param {*} weatherInfo 今天天气信息
 * @param {*} sentence 每日一句土味情话
 */
const setEmailContent = (bingInfo, weatherInfo, sentence) => {
  const today = new Date().toLocaleDateString();  //获取今天的日期
  const weekday = new Date().toLocaleString("default", { weekday: "long" }) // 获取今天是星期几
  const dayCount = parseInt((new Date() - new Date('2000-01-01') / 1000 / 60 / 60 / 24)  // 获取是第几天
  const content = `
        <style>
        .container {
            background-color: rgb(165, 115, 140);
            background: url("${bingInfo.picUrl}") center no-repeat;
            background-size: 100%;
            width: 960px;
            height: 540px;
            display: flex;
            justify-content: space-between;
            flex-direction: column;
            align-items: center;
            color: white;
        }
        .title {
            font-size: 22px;
            margin-top: 50px;
        }
        .description {
            color: white;
        }
        .content {
            background: rgba(255, 255, 255, 0.5);
            margin: 0 auto;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            padding: 20px;
            box-sizing: border-box;
        }
        .content>p {
            text-align: left;
            font-size: 12px;
            color: white;
            width: 100%;
            margin: 5px auto;
            padding: 0;
        }
        </style>
        <div class="container">
            <div class="title">陪你一起看世界:第${dayCount}期</div>
            <a class="description" target="_blank" href="${bingInfo.copyrightlink}">${bingInfo.copyright}</a>
            <div class="content">
                <p style="display: flex;">
                    <span>😘今天是：${today}，${weekday}，是我们在一起的第: ${dayCount}天~🥰🎈🎈🎈，今天天气:  ${weatherInfo.type} 最${weatherInfo.high}，最${
     weatherInfo.low}，今天的风向是:${weatherInfo.fengxiang}。❤❤❤
                    </span>
                </p>
                <p></p>
                <p>${sentence}</p>
            </div>
        </div>
  `;
  return content
}
```

## 使用 nodemailer 发送电子邮件

参考文章：[https://segmentfault.com/a/1190000012251328](https://segmentfault.com/a/1190000012251328)

```javascript
/**
 * @description: 通过Nodemailer发送电子邮件
 * @return {*}
 * @param {*} content 邮件内容
 */
const sendEmailByNodemailer = (content) => {
  const transporter = nodemailer.createTransport({
    service: '163', // 使用了内置传输发送邮件 查看支持列表：https://nodemailer.com/smtp/well-known/
    port: 465, // SMTP 端口
    secureConnection: true, // 使用了 SSL
    auth: {
      user: '1XXXXX@163.com', //邮箱账号
      pass: 'xxxyyyxxxyyzxzxz', // 不是邮箱密码，是你设置的smtp授权码
    },
  });

  let mailOptions = {
    from: `"邮箱名称" <邮箱地址>`, // 发送者 邮件地址
    to: `"邮件标题" <要发送人的邮箱>`, // 逗号隔开的接收人列表
    subject: `想和你一起看世界:第${parseInt(
        (new Date() - new Date('2000-01-01') / 1000 / 60 / 60 / 24,
      )}期`, // 邮件标题
    // 发送text或者html格式
    // text: 'Hello world?', // plain text body
    // 发送的html内容
    html: content,
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log("error", error);
    }
    console.log("Message sent: %s", info.messageId);
    console.log(info);
  });
}
```

## 执行发送邮件操作

```javascript
const handleSendEmail = async () => {
  try {
    const bingInfo = await fetchBingPictrue()
    const weatherInfo = await fetchWeaterByCity()
    const sentence = await fetchSentence()
    const emailContent = setEmailContent(bingInfo, weatherInfo, sentence)
    sendEmailByNodemailer(emailContent)
  } catch (error) {
    // 这里可以catch 相关错误后，将错误信息发送到邮箱通知查看
    console.log("发送信息失败")
  }
}
```

## 实现效果

![image.png](https://cdn.nlark.com/yuque/0/2022/png/2727826/1646114356766-648bb13d-6c6b-4f2c-a828-07f7088369f9.png#clientId=u9cac4c95-743c-4&crop=0&crop=0&crop=1&crop=1&from=paste&height=386&id=B1jVO&margin=%5Bobject%20Object%5D&name=image.png&originHeight=772&originWidth=1223&originalType=binary&ratio=1&rotation=0&showTitle=false&size=1505607&status=done&style=none&taskId=ud6e4804c-980c-4a07-861f-ca4b469ad50&title=&width=611.5)


## 优化-将项目相关配置整合到配置文件中

```javascript
// config.js
// 配置相关信息
exports.config = {
  CITY: '深圳',  //获取城市天气
  TOGETHER_TIME: '2000-01-01', //在一起的时间
  EMAIL_NAME: '陪你一起看世界系列', //邮箱名称
  EMALI_SERVICE: '163', //使用163服务 https://nodemailer.com/smtp/well-known/
  EMAIL_ACCOUNT: 'xxxx@163.com', //使用发送邮箱的账号
  EMAIL_PASS:  'xxxyyyxxxyyzxzxz', // 不是邮箱密码，是你设置的smtp授权码
  TO_EMAIL: '1378485819@qq.com', // 接送者邮箱
  TO_TITLE: '你的专属', //标题
} 
```


## 编写 DOS 命令

```javascript
//  timing-task.bat
//  bat 批处理文件是一个文本文件，这个文件的每一行都是一条DOS命令（大部分时候就好象我们在DOS提示符下执行的命令行一样），你可以使用DOS下的Edit或者Windows的记事本(notepad)等任何文本文件编辑工具创建和修改批处理文件

node D:/node/daily-email.js   //这里写项目执行文件的位置
```

## window系统定时执行 bat 文件

### 进入系统任务计划程序

![image.png](https://cdn.nlark.com/yuque/0/2022/png/2727826/1646120072043-e0d9e3bb-816e-47d2-b891-5ca6a118b2fd.png#clientId=u9cac4c95-743c-4&crop=0&crop=0&crop=1&crop=1&from=paste&height=358&id=u18e59fcc&margin=%5Bobject%20Object%5D&name=image.png&originHeight=716&originWidth=870&originalType=binary&ratio=1&rotation=0&showTitle=false&size=224462&status=done&style=none&taskId=u38078215-f417-4da9-8e53-b4b0b6b184e&title=&width=435)

### 创建基本任务

![image.png](https://cdn.nlark.com/yuque/0/2022/png/2727826/1646120610485-b9bf3afe-53d5-451c-b922-9dab57472870.png#clientId=u9cac4c95-743c-4&crop=0&crop=0&crop=1&crop=1&from=paste&height=313&id=ueecd75df&margin=%5Bobject%20Object%5D&name=image.png&originHeight=625&originWidth=1105&originalType=binary&ratio=1&rotation=0&showTitle=false&size=230758&status=done&style=none&taskId=u4241fd08-e334-4662-8d6f-01542f2ded4&title=&width=552.5)


### 创建基本任务名称和描述

![image.png](https://cdn.nlark.com/yuque/0/2022/png/2727826/1646120877002-978989fd-1757-4f22-8297-54415078013f.png#clientId=u9cac4c95-743c-4&crop=0&crop=0&crop=1&crop=1&from=paste&height=403&id=u697d925e&margin=%5Bobject%20Object%5D&name=image.png&originHeight=634&originWidth=851&originalType=binary&ratio=1&rotation=0&showTitle=false&size=83081&status=done&style=none&taskId=u020ff5ab-ba63-4c01-9ba3-7e205b395a3&title=&width=540.5)

### 选择触发器并设置执行时间

![image.png](https://cdn.nlark.com/yuque/0/2022/png/2727826/1646120964844-ccf8e716-b0f8-4db3-a641-de4b8c2bcfa4.png#clientId=u9cac4c95-743c-4&crop=0&crop=0&crop=1&crop=1&from=paste&height=340&id=ub7b97360&margin=%5Bobject%20Object%5D&name=image.png&originHeight=680&originWidth=855&originalType=binary&ratio=1&rotation=0&showTitle=false&size=70862&status=done&style=none&taskId=ud8e3c868-acda-4cb3-8cf7-26a295e9768&title=&width=427.5)
![image.png](https://cdn.nlark.com/yuque/0/2022/png/2727826/1646121015187-ee7a73a6-79d4-414d-a570-d4036aa0514c.png#clientId=u9cac4c95-743c-4&crop=0&crop=0&crop=1&crop=1&from=paste&height=339&id=u32f200b9&margin=%5Bobject%20Object%5D&name=image.png&originHeight=678&originWidth=859&originalType=binary&ratio=1&rotation=0&showTitle=false&size=52163&status=done&style=none&taskId=u972556be-3a25-4fd6-8048-f12173ded6f&title=&width=429.5)

### 启动程序，选择 bat 文件地址

![image.png](https://cdn.nlark.com/yuque/0/2022/png/2727826/1646121119061-4513942d-0da2-45ae-9bfa-fc9e0ea01d1d.png#clientId=u9cac4c95-743c-4&crop=0&crop=0&crop=1&crop=1&from=paste&height=338&id=ue48f9669&margin=%5Bobject%20Object%5D&name=image.png&originHeight=676&originWidth=856&originalType=binary&ratio=1&rotation=0&showTitle=false&size=61964&status=done&style=none&taskId=uab81ae08-2543-406c-bfed-d019967b0ed&title=&width=428)

### 查看定时任务是否设置成功

![image.png](https://cdn.nlark.com/yuque/0/2022/png/2727826/1646121264524-9e20e4a0-4541-4ad4-8975-f78241a9d297.png#clientId=u9cac4c95-743c-4&crop=0&crop=0&crop=1&crop=1&from=paste&height=330&id=ue967e7f6&margin=%5Bobject%20Object%5D&name=image.png&originHeight=659&originWidth=1266&originalType=binary&ratio=1&rotation=0&showTitle=false&size=266429&status=done&style=none&taskId=u827939ab-ad55-42a2-839e-e9fe2bab2d2&title=&width=633)


# 

# 问题及解决办法

- 手机微信预览QQ邮箱邮件，背景图没显示

![image.png](https://cdn.nlark.com/yuque/0/2022/png/2727826/1646114404005-cf171b31-fdde-4d90-8385-2e12a456c406.png#clientId=u9cac4c95-743c-4&crop=0&crop=0&crop=1&crop=1&from=paste&height=868&id=u1b0e46a2&margin=%5Bobject%20Object%5D&name=image.png&originHeight=1735&originWidth=1080&originalType=binary&ratio=1&rotation=0&showTitle=false&size=615103&status=done&style=none&taskId=ufcb56259-09d9-4983-8296-ac633b91350&title=&width=540)

- 使用 163 邮箱发送邮件到 QQ 邮箱中，背景图无法显示，会提示不是腾讯公司的官方邮件

![image.png](https://cdn.nlark.com/yuque/0/2022/png/2727826/1646114646624-3a7494c4-50a3-4c44-979c-a97834086fe0.png#clientId=u9cac4c95-743c-4&crop=0&crop=0&crop=1&crop=1&from=paste&height=233&id=u76b81e89&margin=%5Bobject%20Object%5D&name=image.png&originHeight=317&originWidth=804&originalType=binary&ratio=1&rotation=0&showTitle=false&size=41118&status=done&style=none&taskId=ud039a7d4-abf5-40d1-bab7-a2706f1720d&title=&width=590)

- **解决办法**，双方都使用 QQ 邮箱，且是 QQ 好友可以避免第二种问题，能够正常显示内容，目前第一种问题暂时没有想到好的解决办法。