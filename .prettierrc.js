export default {
  printWidth: 100, // 单行长度
  tabWidth: 2, // 缩进长度
  useTabs: false, // 使用空格代替tab缩进
  semi: true, // 句末加分号
  singleQuote: true, // 使用单引号代替双引号
  // 仅在必需时为对象属性添加引号
  quoteProps: 'as-needed',
  // jsx中使用单引号
  jsxSingleQuote: true,
  // 多行时尽可能打印尾随逗号
  trailingComma: 'none',
  // 在对象，数组括号与文字之间加空格 "{ foo: bar }"
  bracketSpacing: true,
  // 将 > 多行 JSX 元素放在最后一行的末尾，而不是单独放在下一行
  jsxBracketSameLine: false,
  // 单参数箭头函数不加括号
  arrowParens: 'avoid',
  // 这两个物理是否格式化写入的起始和结束偏移
  rangeStart: 0,
  rangeEnd: Infinity,
  // 指定要使用的解析器，不需要写，prettier会自动选择
  // requirePragma: false,
  // 不需要自动在文件开头插入 @prettier
  // insertPragma: false,
  // 使用默认折行标准
  proseWrap: 'preserve',
  // 换行符
  endOfLine: 'lf'
}
