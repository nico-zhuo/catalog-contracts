# 编码原则

- **编码前先思考**：不确定时要询问，不要默默选择一种解释就直接开始
- **简约至上**：代码最简化，任何过度设计都一目了然
- **精确编辑**：只修改必要的部分，不要顺便修复旁边的代码
- **目标驱动**：在开始前将模糊的指令转化为可验证的目标
- **`catalog.params` 暴露原则**（详见 `README.md` § Param Exposure Principle）：只暴露终端用户业务上应该决策的参数（如画面比例 / 音色 / 风格 / 速度）；**安全相关**（`enable_safety_checker` 等）、**性能成本相关**（`num_inference_steps` / `num_images` / `max_tokens` 等不纳入 creditCost 的）、**技术细节**（`output_format` / `seed` / `sample_rate` 等用户无感知的）三类**必须进 `defaults`，不进 `catalog.params`**。`accepted_params`（或自写 handler 的等价白名单）必须与 `catalog.params` 同步收紧 —— 否则 UI 看不到 ≠ API 调不到，产生安全 illusion。新加 handler PR 时 self-review 三类隐藏参数。
