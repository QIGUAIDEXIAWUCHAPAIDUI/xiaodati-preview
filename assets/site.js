(function () {
  const books = window.BOOKS || [];
  const app = document.getElementById("app");

  function subjectOrder() {
    const counts = {};
    books.forEach(function (book) {
      counts[book.subject] = (counts[book.subject] || 0) + 1;
    });
    return Object.keys(counts).sort(function (a, b) {
      if (a === "综合") return -1;
      if (b === "综合") return 1;
      if (counts[b] !== counts[a]) return counts[b] - counts[a];
      return a.localeCompare(b, "zh");
    });
  }

  const subjects = ["全部"].concat(subjectOrder());

  const state = {
    q: "",
    subject: "全部",
    scroll: 0,
    light: -1,
  };

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function pageSrc(book, page) {
    return "preview/" + book.id + "/p" + String(page).padStart(3, "0") + ".jpg";
  }

  function thumbSrc(book) {
    return "preview/" + book.id + "/thumb.jpg";
  }

  function currentId() {
    return decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  }

  function findBook(id) {
    return books.filter(function (book) { return book.id === id; })[0];
  }

  function rangeLabel(pages) {
    if (!pages.length) return "";
    const consecutive = pages.every(function (page, index) {
      return index === 0 || page === pages[index - 1] + 1;
    });
    if (pages.length === 1) return "第 " + pages[0] + " 页";
    if (consecutive) return "第 " + pages[0] + "–" + pages[pages.length - 1] + " 页";
    return pages.map(function (page) { return "第 " + page + " 页"; }).join("、");
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return books.filter(function (book) {
      if (state.subject !== "全部" && book.subject !== state.subject) return false;
      if (!q) return true;
      return (book.title + " " + book.subject + " " + book.kind + " " + book.file).toLowerCase().indexOf(q) >= 0;
    });
  }

  function badge(kind) {
    if (!kind || kind === "小大题") return "";
    return '<span class="badge">' + esc(kind) + "</span>";
  }

  function stripOf(book) {
    const pages = [];
    ["front", "mid", "back"].forEach(function (key) {
      book[key].forEach(function (page) {
        if (pages.indexOf(page) < 0) pages.push(page);
      });
    });
    return pages;
  }

  function catalogHtml() {
    const list = filtered();
    const groups = [];
    list.forEach(function (book) {
      let group = groups.filter(function (item) { return item.subject === book.subject; })[0];
      if (!group) {
        group = { subject: book.subject, books: [] };
        groups.push(group);
      }
      group.books.push(book);
    });
    const order = subjectOrder();
    groups.sort(function (a, b) {
      return order.indexOf(a.subject) - order.indexOf(b.subject);
    });
    groups.forEach(function (group) {
      group.books.sort(function (a, b) {
        return a.title.localeCompare(b.title, "zh", { numeric: true, sensitivity: "base" });
      });
    });
    const body = groups.length
      ? groups.map(function (group) {
          const cards = group.books.map(function (book) {
            return (
              '<button class="card" type="button" data-id="' + esc(book.id) + '">' +
                '<img src="' + esc(thumbSrc(book)) + '" alt="' + esc(book.title) + '封面" loading="lazy">' +
                "<h3>" + esc(book.title) + "</h3>" +
                '<p class="meta">' + badge(book.kind) + esc(book.pages) + " 页</p>" +
              "</button>"
            );
          }).join("");
          return '<section class="group"><h2>' + esc(group.subject) + " <em>" + group.books.length + "</em></h2><div class=\"grid\">" + cards + "</div></section>";
        }).join("")
      : '<p class="empty">没有对上的教材。</p>';
    return '<p class="count-line">共 ' + books.length + " 本，当前 " + list.length + " 本</p>" + body;
  }

  function navHtml() {
    const id = currentId();
    function item(key, label) {
      const on = id === key ? "page" : "false";
      return '<button class="nav" type="button" data-goto="' + key + '" aria-current="' + on + '">' + label + "</button>";
    }
    return '<nav class="navs">' + item("notice", "购买说明") + item("request", "笔记缺失需求反馈") + "</nav>";
  }

  function realWechat(value) {
    const text = value.replace(/[\s-]/g, "");
    if (!text || text === "本人正在使用的微信号") return false;
    if (/^(\+?86)?1\d{10}$/.test(text)) return true;
    if (/^wxid_[a-zA-Z0-9_]{5,}$/.test(text)) return true;
    if (/^[a-zA-Z][-_a-zA-Z0-9]{5,19}$/.test(text)) return true;
    return false;
  }

  function bindRequest(form) {
    const note = form.querySelector(".request-note");
    const button = form.querySelector("button[type=submit]");
    function refreshSubmit() {
      const ok = realWechat(form.wechat.value.trim());
      button.disabled = !ok;
    }
    form.wechat.addEventListener("input", refreshSubmit);
    refreshSubmit();
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const book = form.book.value.trim();
      const wechat = form.wechat.value.trim();
      if (!realWechat(wechat)) {
        note.textContent = "请填写真实微信号，未填写无法提交。";
        form.wechat.focus();
        refreshSubmit();
        return;
      }
      if (!book) {
        note.textContent = "请写清作者、书名和版次。";
        form.book.focus();
        return;
      }
      note.textContent = "正在收录…";
      fetch("collector.txt?t=" + Date.now())
        .then(function (res) { return res.text(); })
        .then(function (url) {
          return fetch(url.trim(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ book: book, wechat: wechat })
          });
        })
        .then(function (res) {
          if (!res.ok) throw new Error("bad");
          note.textContent = "已收录。请保持这个微信可被搜索，方便回复这本笔记是否整理。";
          form.reset();
        })
        .catch(function () {
          note.textContent = "这次没有送进收录表，请稍后再试。";
        });
    });
  }

  function bindSearch(input) {
    let composing = false;
    input.addEventListener("compositionstart", function () { composing = true; });
    input.addEventListener("compositionend", function () {
      composing = false;
      state.q = input.value;
      paintCatalog();
    });
    input.addEventListener("input", function () {
      if (composing) return;
      state.q = input.value;
      paintCatalog();
    });
  }

  function paintCatalog() {
    const box = app.querySelector("#catalog");
    if (!box) return;
    box.innerHTML = catalogHtml();
    app.querySelectorAll(".chip").forEach(function (chip) {
      chip.setAttribute("aria-pressed", chip.getAttribute("data-subject") === state.subject ? "true" : "false");
    });
  }

  function renderIndex() {
    const fresh = !app.querySelector("#catalog");
    if (fresh) {
      const chips = subjects.map(function (subject) {
        const pressed = subject === state.subject ? "true" : "false";
        return '<button class="chip" type="button" data-subject="' + esc(subject) + '" aria-pressed="' + pressed + '">' + esc(subject) + "</button>";
      }).join("");
      app.innerHTML =
        '<header class="top"><div class="wrap top-row">' +
          '<button class="brand" type="button" data-home="1"><span><h1>小大题系列笔记预览站</h1><p>笔记展示开头·正中·最后部分页码</p></span></button>' +
          navHtml() +
          '<input class="search" type="text" lang="zh-CN" placeholder="搜书名、作者" value="' + esc(state.q) + '" aria-label="搜索" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">' +
        "</div><div class=\"wrap filters\">" + chips + "</div></header>" +
        '<main class="wrap" id="catalog"></main>';
      bindSearch(app.querySelector(".search"));
      window.scrollTo(0, state.scroll || 0);
    }
    paintCatalog();
  }

  function renderNotice() {
    app.innerHTML =
      '<header class="top"><div class="wrap top-row">' +
        '<button class="brand" type="button" data-home="1"><span><h1>小大题系列笔记预览站</h1><p>返回目录</p></span></button>' +
        navHtml() +
      "</div></header>" +
      '<article class="notice">' +
        '<button class="back" type="button" data-home="1">← 全部教材</button>' +
        "<h2>购买说明</h2>" +
        '<p class="kicker">不创作低质、烂大街的笔记，也不接受低廉的知识创作报酬。</p>' +
        "<p>同学你好：首先，非常感谢你的咨询；其次，请再阅览了解如下信息。</p>" +
        '<figure class="poster"><img src="assets/buy-guide.jpg" alt="购买方式见此图" width="2536" height="2214"></figure>' +
        '<section class="panel panel-ink">' +
          "<h3>谁在买</h3>" +
          "<p>购买资料的同学报考院校包括但不限于：广西大学、南京大学、中国农业大学、四川大学、电子科技大学、对外经济贸易大学、华南理工大学、西南财经大学、浙江财经大学、大连理工大学、郑州大学、南京工业大学、西南政法大学、中国人民大学、吉林大学、福州大学等 30 所院校。为什么同学们买了自己直系学长学姐的笔记，还会买我的笔记？</p>" +
          '<p class="spot">购买任何《小大题》系列笔记后，可加入小红书分学科考研交流群（目前共计 <b>130 人↑</b>）。</p>' +
          "<p>不定期免费分享原创笔记。</p>" +
          "<p>群内免费分享均为个人自愿整理与更新，不属于固定服务内容，也不承诺更新频率。</p>" +
        "</section>" +
        '<section class="panel panel-note">' +
          "<h3>需要注意</h3>" +
          "<p>小大题笔记主要用于凝练教材重点、梳理知识框架、规范答题表达，减少自行整理资料的时间成本；但不能代替理解、背诵和练习，也不代表专业课会因此变得轻松。</p>" +
          "<p>每个人的基础、时间和背诵速度不同，因此不承诺、也不代为规划「每天背多少页」「多久完成一轮」等个人进度。具体使用方法请先阅读笔记前言及《背诵笔记使用建议》。</p>" +
          "<p>答疑主要围绕所购笔记及使用方法展开，不包含一对一督导、每日学习安排、背诵页码规划、学习时长分配及个人复习进度设计。</p>" +
        "</section>" +
        '<section class="panel panel-price">' +
          "<h3>价格规则</h3>" +
          "<table class=\"price\"><thead><tr><th>份数</th><th>这一本</th><th>合计</th></tr></thead><tbody>" +
            "<tr><td>第一份</td><td class=\"yen\">150 元</td><td>买 1 本笔记 = <b>150 元</b></td></tr>" +
            "<tr><td>第二份</td><td class=\"yen\">120 元</td><td>买 2 本笔记 = 150＋120＝<b>270 元</b></td></tr>" +
            "<tr><td>第三份</td><td class=\"yen\">100 元</td><td>买 3 本笔记 = 150＋120＋100＝<b>370 元</b></td></tr>" +
          "</tbody></table>" +
          "<p>优惠持续有。比如第一次买了一本 150，隔一段时间又想买第二本笔记，那么第二本笔记依然是 120。</p>" +
        "</section>" +
        '<section class="panel panel-stop">' +
          "<h3>购买及使用说明</h3>" +
          "<p>资料及群二维码发送后，不接受因「内容多、难背、时间不足」等个人原因退款。</p>" +
          "<p>答疑以微信／群聊留言为主，看到就会回复，不属于实时在线「服务」。</p>" +
          "<p>笔记及群内原创资料、个人情况仅限本人学习使用或了解知情，请勿二传、拼单、倒卖或公开传播；如有侵权，将依法维权。</p>" +
        "</section>" +
        "<h3>关于 150 元</h3>" +
        '<p><span class="mark">第一，是信息差。</span>笔记本身就是我已经筛选、整理过的信息，省下的是大家自己搜集资料、辨别重点、反复试错的时间成本。</p>' +
        '<p><span class="mark">第二，是后续服务。</span>笔记相关的问题我都会尽量回复，后续有需要调整、补充的地方，也会继续处理。不能说是什么「高规格服务」，但至少我会对自己整理出来的东西负责。网上价格更高的资料很多，内容是否陈旧、是否拼凑、是否有人后续负责，同学们可以货比三家、自行判断。</p>' +
        '<p><span class="mark">第三，我自己也是这样一路过来的。</span>考研本身就会产生教材、资料、打印、课程等各种支出。哪些钱值得花、哪些没必要花，每个人都会有自己的判断。</p>' +
        "<p>150 元算不上便宜，所以我能做的，就是尽量让内容和后续都对得起这个价格。从目前收到的反馈来看，至少我确实没有辜负这份定价。</p>" +
        '<section class="panel panel-stop">' +
          "<h3>不接受的购买</h3>" +
          "<p>不接受售出给学长学姐、机构组织。目前「考研笔记 / 机构 / 辅导 / 班级」等市场鱼龙混杂，本人不参与低质内容竞争，也不接受倒卖、搬运或机构批量采购。</p>" +
          "<p>从现在起购买笔记，可能我会随机核验；我没有表示怀疑的，不会核验。（主要针对小号或水军号）</p>" +
          "<p>如果你是学长学姐或是其他什么考研机构，请拿实力做事，而不是靠窃取他人成果！</p>" +
        "</section>" +
        '<p class="close-line">认真做内容，也只把内容交给真实备考的人。</p>' +
        "<p>选择相互，理解至上。如果暂时不需要，也欢迎继续留意后续经验分享。</p>" +
        '<p class="dated">2026年9月23日星期三</p>' +
      "</article>" +
      '<article class="notice faq" id="faq">' +
        "<h2>常见疑问</h2>" +
        '<p class="kicker">常见疑问小大题</p>' +
        '<section class="faq-item">' +
          "<h3><span class=\"qnum\">1.</span>小大题到底是什么？</h3>" +
          "<p>小大题是按指定考研专业课教材，整理成「小题＋大题」的命题式笔记。</p>" +
          "<p>它要跨越的，是教材内容与考场所谓「标准答案」之间那段看不见的距离：读懂教材，只是完成了知识输入；把知识在有限的考试时间内转化为规范、让人眼前一亮的表达，才算有效备考。它不是教材缩写本（据观察，目前市面上的笔记，尤其是换书后某些被整理出来的笔记，多是教材原封不动的复制粘贴，就冠以「重点」「考点」名称，同学们可自行比对），也不是真题汇编，而是一次主动的原创整理——把零散知识重新放入题型结构之中，变成可以记忆、可以提取、可以迁移的答案体系。</p>" +
        "</section>" +
        '<section class="faq-item">' +
          "<h3><span class=\"qnum\">2.</span>小题和大题分别对应什么？</h3>" +
          "<p>基于这一考虑，笔记按照「小题」和「大题」两个部分组织。</p>" +
          "<p>小题主要对应名词解释及基础知识考查。每个知识点先用完整定义回答「它是什么」，再围绕本质属性、核心内容、适用对象、基本特征或理论意义展开，建立「知识点名称—核心定义—主要内涵」之间的稳定联系。小题中的五个阐释，同时也是判断、辨析和选择的可能出题方向，放在这里，不仅可以作为名词解释的理解，也可以作为判断、辨析、选择题的作答依据。</p>" +
          "<p>大题主要以简答题形式呈现。论述题、案例分析题，其实就是简答题的扩展版。简答题的命题方式包括比较、评价、意义、原因、问题对策和材料分析。每道题通常按照「开头界定—分点展开—总结提升」来组织。</p>" +
        "</section>" +
        '<section class="faq-item">' +
          "<h3><span class=\"qnum\">3.</span>要不要还看教材？</h3>" +
          "<p>时间宽裕的话，可以看；反之可以不看。教材按学科体系展开，重视概念的生成、理论的演进、观点的论证与知识的联系；考试则要求在有限时间内识别题型、判断范围、组织层次，并以准确、完整、规范的语言呈现答案。小大题管后半段，教材管前半段。</p>" +
          "<p>一个概念的定义可能出现于章节开头，其特征分散在后文，作用、意义和评价又隐藏在其他段落之中。第一轮对照教材，是为了知道这句话从哪来；第二轮以小大题为主，是为了写得出来。</p>" +
        "</section>" +
        '<section class="faq-item">' +
          "<h3><span class=\"qnum\">4.</span>是最全面的梳理吗？</h3>" +
          "<p>不说绝对，至少是当前最全的梳理之一。除了正文以外，有些小大题笔记中出现的「补充资料」就是教材章节内容后面的「章末阅读」「拓展」「专栏」「学习卡片」「案例」等。教材每一处，本人都做了详细的挖掘与研判。</p>" +
        "</section>" +
        '<section class="faq-item">' +
          "<h3><span class=\"qnum\">5.</span>是否适配报考院校？</h3>" +
          "<p>经过多次院校真题匹配，小大题与所有报考院校适配程度均在 <b>90%</b> 以上；因为小大题的整理逻辑，本身就是建立在教材之上，只要报考院校指定的是对应这本小大题的参考教材，就可以使用。教材上的要点梳理是不变的，唯一变的只是考试题型、分数而已。</p>" +
        "</section>" +
        '<section class="faq-item">' +
          "<h3><span class=\"qnum\">6.</span>如何背诵？感觉太厚了</h3>" +
          "<p>群内会有相关背诵建议。小题如何背诵、大题如何背诵；但实际要根据自身背书能力与习惯调整。简单总结一下用法是：先掌握骨架，再补充表达。小题先记住核心定义和提示词；大题先判断题干问了几个层面。不要从第一页逐字背到最后一页。</p>" +
        "</section>" +
        '<section class="faq-item">' +
          "<h3><span class=\"qnum\">7.</span>学校参考书版本和笔记不一致怎么办？</h3>" +
          "<p>一般来讲，新版本会比老版本更适用考试。有些教材的版本更新也只是对其章节案例的更新，对核心知识的改动甚少甚至全无。但何艳玲老师第二版，较第一版而言，改动较大，可见本人对新老版本的分析转帖。例如学校指定第三版、小大题是第四版的，一般仍可使用。</p>" +
        "</section>" +
        '<section class="faq-item">' +
          "<h3><span class=\"qnum\">8.</span>能不能发给同学、传到网盘？</h3>" +
          '<p class="ban">不能。全书仅限购买者本人打印学习；翻印、扫描、上传、拼团共享、转售、改名使用都不允许。</p>' +
        "</section>" +
        '<section class="faq-item">' +
          "<h3><span class=\"qnum\">9.</span>用了就能拿高分吗？</h3>" +
          "<p>真正可靠的记忆来自理解，真正稳定的答案来自结构。逐字背诵能够帮助我们熟悉语言，逻辑理解则能保证我们在忘记个别句子时继续作答。所以小大题不保证拿高分，也不是押中原题的清单。（但多项验证表明，多所院校的真题，都能在小大题上找到原题。）</p>" +
        "</section>" +
        '<section class="faq-item">' +
          "<h3><span class=\"qnum\">10.</span>跨考生能不能直接用？</h3>" +
          "<p>能用，而且往往更需要。跨考缺的是教材秩序和题型感觉。据反馈，小大题小题部分对概念的解释完备、对大题要点的阐释准而优。</p>" +
        "</section>" +
        '<section class="faq-item">' +
          "<h3><span class=\"qnum\">11.</span>小大题笔记与其他资料的差异</h3>" +
          "<p>常见差异有四条。第一，只依据指定教材，不从别的书、论文或常识里补观点。第二，小题阐释固定为五点制（加深概念理解，应对辨析、判断、选择），大题严格保留教材一级要点数量。第三，目录收到每一道小题和大题题目，方便按题检索。第四，复刻「答卷」呈现、工整、美观。</p>" +
        "</section>" +
        '<section class="faq-item">' +
          "<h3><span class=\"qnum\">12.</span>适合谁用？不适合谁？</h3>" +
          '<p class="fit">适合：目标院校指定了这本参考书；愿意把专业课当成「写出完整答案」来准备的人；跨考需要从零建立题型感的人；二战发现「看过但写不出」的人。</p>' +
          '<p class="unfit">不适合：只想要几页关键词、希望一份笔记覆盖所有学校所有书、或者指望买完就不用自己默写的人。</p>' +
        "</section>" +
        '<section class="faq-item">' +
          "<h3><span class=\"qnum\">13.</span>目录怎么用才对？</h3>" +
          "<p>把它当检索表，抽背单。第一轮按章往下读；第二轮按题目打勾；考前按「今天默哪几题」跳页。目录里章、部分、主题加粗，1.题目不加粗，是为了同学们自行勾画，化为己用。</p>" +
        "</section>" +
        '<section class="faq-item">' +
          "<h3><span class=\"qnum\">14.</span>教材只写了三点和四点，笔记为什么有五点？</h3>" +
          "<p>先完整保留教材原有要点，再从该书上下文做解释性补足。补出的要点均能从教材得到支持，本人并没有另起炉灶加新理论、新观点。这叫「补足」，不是「编造」。此外，还可能是来自本书作者的学术论文观点。</p>" +
        "</section>" +
        '<section class="afterword">' +
          "<h3>写在后面</h3>" +
          "<p>笔记不便宜，但笔记优质、呈现亮眼，持续吸引着备考的同学们前来咨询与购买；期间收获不少肯定与支持。此外，笔记附带的赠送资料让不少同学发出「物超所值」的感叹。</p>" +
          "<p>谨以一个过来人的身份，把曾经走过的弯路、反复验证的方法和逐渐建立的答案体系留在这套笔记中。希望它能够帮助你：少一些面对厚重教材时的茫然，多一些知道从何入手的笃定；少一些资料不断增加的焦虑，多一些知识逐渐清晰的踏实；少一些考场落笔时的迟疑，多一些胸中有序、笔下有言的从容。</p>" +
          "<p>愿你：合上教材以后依然能够说清知识；面对变化的题目依然能够找到逻辑；走进考场之际，曾经读过、理解过、背诵过和默写过的每一页，都能在那时被铿锵落笔。</p>" +
        "</section>" +
      "</article>";
    window.scrollTo(0, 0);
  }

  function renderRequest() {
    app.innerHTML =
      '<header class="top"><div class="wrap top-row">' +
        '<button class="brand" type="button" data-home="1"><span><h1>小大题系列笔记预览站</h1><p>返回目录</p></span></button>' +
        navHtml() +
      "</div></header>" +
      '<article class="notice">' +
        '<button class="back" type="button" data-home="1">← 全部教材</button>' +
        '<form class="request" novalidate>' +
          "<h2>笔记缺失需求反馈</h2>" +
          "<p>目录里没有的教材，可以留在这里。请写作者、书名和版次，例如：于圣《文学疗愈》第七版。</p>" +
          '<label>作者、书名和版次<input name="book" type="text" placeholder="于圣《文学疗愈》第七版" autocomplete="off"></label>' +
          '<label>真实微信联系方式（必填）<input name="wechat" type="text" required placeholder="本人正在使用的微信号" autocomplete="off"></label>' +
          '<p class="request-limit">目前只整理这些学科的笔记：管理学、社会学、教育学、政治学、经济学（文）、统计学（文）。超出这个范围的，先不收录。</p>' +
          '<p class="request-actions"><button type="submit">提交反馈</button><span class="request-hours">收录开放时间：9:00–23:00</span></p>' +
          '<p class="request-note" role="status"></p>' +
        "</form>" +
      "</article>";
    bindRequest(app.querySelector(".request"));
    window.scrollTo(0, 0);
  }

  function renderBook(book) {
    const sections = [
      ["front", "壹", "开头"],
      ["mid", "贰", "中间"],
      ["back", "叁", "结尾"],
    ];
    const sheets = sections.map(function (item) {
      const pages = book[item[0]];
      const figs = pages.map(function (page, index) {
        const loading = index < 2 ? "eager" : "lazy";
        return (
          '<figure class="sheet"><button type="button" data-page="' + page + '">' +
            '<img src="' + esc(pageSrc(book, page)) + '" alt="' + esc(book.title) + " 第 " + page + ' 页" loading="' + loading + '">' +
          "</button><figcaption>第 " + page + " 页 / 共 " + book.pages + " 页</figcaption></figure>"
        );
      }).join("");
      return (
        '<div class="section-head"><span class="num">' + item[1] + '</span><h3>' + item[2] + "</h3><span>" + esc(rangeLabel(pages)) + "</span></div>" +
        figs
      );
    }).join("");
    app.innerHTML =
      '<header class="top"><div class="wrap top-row">' +
        '<button class="brand" type="button" data-home="1"><span><h1>小大题系列笔记预览站</h1><p>返回目录</p></span></button>' +
        navHtml() +
      "</div></header>" +
      '<article class="book"><button class="back" type="button" data-home="1">← 全部教材</button>' +
        "<h2>" + esc(book.title) + "</h2>" +
        '<p class="lead">' + badge(book.kind) + esc(book.subject) + " · 全书 " + book.pages + " 页 · 样张 " + stripOf(book).length + " 页</p>" +
        sheets +
      "</article>";
    window.scrollTo(0, 0);
  }

  function renderLight(book) {
    const pages = stripOf(book);
    if (state.light < 0 || state.light >= pages.length) return;
    const page = pages[state.light];
    const node = document.createElement("div");
    node.className = "light";
    node.innerHTML =
      "<header><span>" + esc(book.title) + "</span><button type=\"button\" data-close=\"1\">关闭</button></header>" +
      '<div class="stage"><img src="' + esc(pageSrc(book, page)) + '" alt="第 ' + page + ' 页"></div>' +
      "<footer><button type=\"button\" data-step=\"-1\">上一页</button><span>第 " + page + " 页 · " + (state.light + 1) + " / " + pages.length + "</span><button type=\"button\" data-step=\"1\">下一页</button></footer>";
    document.body.appendChild(node);
    document.body.style.overflow = "hidden";
  }

  function closeLight() {
    state.light = -1;
    const node = document.querySelector(".light");
    if (node) node.remove();
    document.body.style.overflow = "";
  }

  function render() {
    closeLight();
    const id = currentId();
    if (id === "notice") {
      renderNotice();
      return;
    }
    if (id === "request") {
      renderRequest();
      return;
    }
    const book = id ? findBook(id) : null;
    if (book) renderBook(book);
    else renderIndex();
  }

  app.addEventListener("click", function (event) {
    const home = event.target.closest("[data-home]");
    if (home) {
      state.scroll = 0;
      if (location.hash) location.hash = "";
      else render();
      return;
    }
    const goto = event.target.closest("[data-goto]");
    if (goto) {
      const next = "#/" + goto.getAttribute("data-goto");
      if (location.hash !== next) location.hash = next;
      else render();
      return;
    }
    const chip = event.target.closest("[data-subject]");
    if (chip) {
      state.subject = chip.getAttribute("data-subject");
      state.scroll = 0;
      renderIndex();
      return;
    }
    const card = event.target.closest("[data-id]");
    if (card) {
      state.scroll = window.scrollY;
      location.hash = "#/" + card.getAttribute("data-id");
      return;
    }
    const shot = event.target.closest("[data-page]");
    if (shot) {
      const book = findBook(currentId());
      if (!book) return;
      const page = Number(shot.getAttribute("data-page"));
      state.light = stripOf(book).indexOf(page);
      renderLight(book);
    }
  });

  document.addEventListener("click", function (event) {
    const close = event.target.closest("[data-close]");
    const step = event.target.closest("[data-step]");
    if (close) {
      closeLight();
      return;
    }
    if (!step) return;
    const book = findBook(currentId());
    if (!book) return;
    const pages = stripOf(book);
    state.light = (state.light + Number(step.getAttribute("data-step")) + pages.length) % pages.length;
    closeLight();
    renderLight(book);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeLight();
    if (!document.querySelector(".light")) return;
    const book = findBook(currentId());
    if (!book) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const pages = stripOf(book);
      const delta = event.key === "ArrowLeft" ? -1 : 1;
      state.light = (state.light + delta + pages.length) % pages.length;
      closeLight();
      renderLight(book);
    }
  });

  window.addEventListener("hashchange", render);
  render();
})();
