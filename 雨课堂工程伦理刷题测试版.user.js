// ==UserScript==
// @name         雨课堂工程伦理刷题（手动提交测试版）
// @namespace    local.engineering.ethics
// @version      0.7
// @description  根据本地题库选择答案；由用户手动提交
// @match        https://www.yuketang.cn/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(function () {
  'use strict';
  // 题目实际位于 iframe；外层课程页不创建面板。
  if (window.top === window) return;
  const bank = {"1":{"1":"C","2":"B","3":"B","4":"A","5":"B","6":"C","7":"D","8":"B","9":"A","10":"ABCD","11":"ABC","12":"ABD","13":"CD","14":"AC","15":"BCD","16":"AD","17":"ABC","18":"F","19":"T","20":"T"},"2":{"1":"B","2":"A","3":"C","4":"B","5":"A","6":"C","7":"B","8":"D","9":"D","10":"C","11":"CD","12":"AB","13":"BCD","14":"ABC","15":"BD","16":"AB","17":"ACD","18":"BCD","19":"F","20":"F","21":"T","22":"T","23":"F"},"3":{"1":"A","2":"C","3":"B","4":"D","5":"B","6":"D","7":"D","8":"C","9":"ABC","10":"BCD","11":"ABD","12":"BD","13":"ABCD","14":"ABCD","15":"T","16":"T","17":"F","18":"T"},"4":{"1":"B","2":"C","3":"C","4":"C","5":"C","6":"D","7":"A","8":"B","9":"D","10":"ABC","11":"ABCD","12":"ABCD","13":"ABCD","14":"ABCD","15":"ABC","16":"ABCD","17":"ABCD","18":"ABCD","19":"ABCD","20":"T","21":"F","22":"T","23":"T"},"5":{"1":"B","2":"C","3":"D","4":"D","5":"B","6":"C","7":"C","8":"ABCD","9":"ABD","10":"BD","11":"ABCD","12":"ABCD","13":"ACD","14":"BCD","15":"ACD","16":"AC","17":"ABCD","18":"F","19":"F","20":"T"},"6":{"1":"A","2":"C","3":"D","4":"B","5":"D","6":"A","7":"B","8":"ABCD","9":"BC","10":"ABCD","11":"ABCD","12":"BCD","13":"ABCD","14":"ACD","15":"ABCD","16":"BD","17":"ABCD","18":"F","19":"T","20":"T","21":"F","22":"T"},"7":{"1":"A","2":"B","3":"D","4":"C","5":"B","6":"A","7":"C","8":"CD","9":"ABCDE","10":"ABCD","11":"ABCD","12":"ABD","13":"ABCD","14":"ACD","15":"ABC","16":"ABCDE","17":"ABCDE","18":"T","19":"F","20":"F","21":"T","22":"F"},"8":{"1":"B","2":"D","3":"A","4":"A","5":"D","6":"C","7":"D","8":"C","9":"B","10":"AC","11":"BC","12":"AD","13":"ABC","14":"ABD","15":"AB","16":"BCD","17":"ABC","18":"BC","19":"CD","20":"F","21":"T","22":"T","23":"T","24":"T"},"9":{"1":"ABCD","2":"ABCD","3":"ABCD","4":"AC","5":"ABD","6":"ABCD","7":"ABCD","8":"ABCD","9":"ABC","10":"ACD","11":"T","12":"F","13":"F","14":"T","15":"T","16":"T","17":"F","18":"T","19":"T"},"10":{"1":"C","2":"B","3":"C","4":"B","5":"D","6":"A","7":"A","8":"C","9":"ABD","10":"BD","11":"BD","12":"BCD","13":"ABCD","14":"BC","15":"ABCD","16":"T","17":"F","18":"F","19":"T","20":"T"},"11":{"1":"B","2":"C","3":"C","4":"A","5":"C","6":"C","7":"D","8":"ACD","9":"ABCD","10":"ABC","11":"ABCD","12":"ABC","13":"BC","14":"ABC","15":"ABCD","16":"F","17":"T","18":"T","19":"F"},"12":{"1":"C","2":"B","3":"C","4":"ABCD","5":"ACD","6":"ABCD","7":"T","8":"F","9":"F","10":"F","11":"T"},"13":{"1":"C","2":"D","3":"B","4":"D","5":"A","6":"C","7":"B","8":"B","9":"ABCD","10":"BCD","11":"ABDE","12":"ACD","13":"ABCD","14":"ABC","15":"ABCD","16":"ABD","17":"T","18":"T","19":"F","20":"F","21":"T"},"14":{"1":"D","2":"D","3":"A","4":"D","5":"A","6":"A","7":"D","8":"ABCE","9":"ABCD","10":"ABCD","11":"ABC","12":"ABCD","13":"ABD","14":"ABD","15":"T","16":"F","17":"T","18":"F"},"15":{"1":"A","2":"C","3":"A","4":"C","5":"D","6":"A","7":"B","8":"D","9":"A","10":"C","11":"ABD","12":"ABC","13":"ABD","14":"ABC","15":"ABCD","16":"ABCD","17":"AC","18":"T","19":"F","20":"T","21":"T","22":"F","23":"T"}};
  let pending = null;
  let stopped = false;
  function visible(el) { return !!(el && el.getClientRects().length); }
  function lectureNumber() {
    let title = '';
    try {
      const p = window.parent.document;
      title = p.querySelector('.control-left .unit-title')?.textContent
        || p.querySelector('.unit-title')?.textContent
        || p.querySelector('.leaf-item.is-active .leaf-item-title')?.textContent || '';
    } catch (_) {}
    const m = title.match(/第\s*0?(\d+)\s*讲[^\n]{0,60}习题/);
    if (m) return +m[1];
    return null;
  }
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;right:20px;top:75px;z-index:2147483647;background:#fff;color:#222;border:2px solid #3976ec;border-radius:8px;padding:10px 14px;font:14px sans-serif;box-shadow:0 2px 12px #888;max-width:360px';
  document.body.appendChild(panel);
  function status(message) { panel.textContent = '工程伦理自动答题：' + message; }
  function stop(message) { stopped = true; status(message); }
  function button(label) {
    return [...document.querySelectorAll('.problem-box button')].find(x =>
      visible(x) && x.textContent.trim() === label && !x.disabled);
  }
  function tick() {
    if (stopped) return;
    const item = [...document.querySelectorAll('.subject-item')].find(x => visible(x) && x.querySelector('.item-type'));
    if (!item) { status('等待作业题目加载'); return; }
    const heading = item.querySelector('.item-type')?.textContent || '';
    const question = heading.match(/(\d+)\s*[.．、]/) || document.querySelector('.problems-aside .is-active')?.textContent.match(/\d+/);
    const lecture = lectureNumber();
    if (!lecture || !question) { stop(`识别失败：讲次=${lecture || '未知'}，题号=${question?.[1] || '未知'}`); return; }
    const n = +question[1], key = lecture + ':' + n;
    const active = document.querySelector('.problems-aside .subject-item.active');
    const completed = !!active?.querySelector('.status-container .success');
    if (pending) {
      if (pending.key !== key) pending = null;
      else if (pending.phase === 'next') {
        if (Date.now() - pending.time > 8000) stop(`第${lecture}讲第${n}题后未进入下一题`);
        return;
      } else if (completed) {
        const next = button('下一题');
        if (next) { pending = {key, time:Date.now(), phase:'next'}; next.click(); status(`第${lecture}讲第${n}题已完成，进入下一题`); return; }
        stop(`第${lecture}讲作业已结束`); return;
      } else if (Date.now() - pending.time > 12000) { stop(`第${lecture}讲第${n}题提交后页面未前进，请检查`); return; }
      else { status(`第${lecture}讲第${n}题等待提交结果`); return; }
    }
    if (completed) {
      const next = button('下一题');
      if (next) { pending = {key,time:Date.now(),phase:'next'}; next.click(); status(`跳过已完成的第${n}题`); return; }
      stop(`第${lecture}讲作业已结束`); return;
    }
    const answer = bank[lecture]?.[n];
    if (!answer) { stop(`第${lecture}讲第${n}题无题库答案`); return; }
    const options = [...item.querySelectorAll('label.el-radio, label.el-checkbox')].filter(visible);
    if (!options.length) { status(`第${lecture}讲第${n}题：尚未找到选项`); return; }
    const isJudge = /判断/.test(heading);
    if (isJudge !== /^[TF]$/.test(answer)) { stop(`第${lecture}讲第${n}题题型与答案不符`); return; }
    const letters = answer === 'T' ? ['true'] : answer === 'F' ? ['false'] : [...answer];
    const selected = options.filter(x => letters.includes(x.querySelector('input')?.value));
    if (selected.length !== letters.length || options.length < 2) { stop(`第${lecture}讲第${n}题选项与题库不符`); return; }
    const isMulti = /多选/.test(heading);
    if ((isMulti && options.some(x=>!x.classList.contains('el-checkbox'))) || (!isMulti && letters.length > 1)) {
      stop(`第${lecture}讲第${n}题题型与答案不符`); return;
    }
    for (const option of options) {
      const should = selected.includes(option);
      const checked = option.querySelector('input')?.checked === true
        || option.getAttribute('aria-checked') === 'true'
        || option.classList.contains('is-checked');
      if (should !== checked) { option.click(); status(`第${lecture}讲第${n}题选择 ${answer}`); return; }
    }
    const submit = button('提交');
    if (!submit) { stop(`第${lecture}讲第${n}题提交按钮不可用`); return; }
    status(`第${lecture}讲第${n}题已选 ${answer}；请手动提交`);
  }
  setInterval(tick, 900);
  tick();
})();
