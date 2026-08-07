# RAG evaluation report

Generated: 2026-08-07T06:59:09.216Z

Result: **20/20 passed (100%)**

This automated run validates retrieval grounding and expected handoff policy against the synthetic question set. Full n8n smoke tests are documented separately because the n8n test webhook accepts one interactive test execution at a time.

| ID | Question | Expected | Top source | Score | Handoff rule | Pass |
|---|---|---|---|---:|---|---|
| q01 | 云朵办公椅有什么功能？ | grounded | product-catalog.md | 0.8822 | no | yes |
| q02 | 晨光保温杯有多大容量？ | grounded | product-catalog.md | 0.9997 | no | yes |
| q03 | 星轨桌面灯可以调节色温吗？ | grounded | product-catalog.md | 0.9728 | no | yes |
| q04 | 满多少元可以包邮？ | grounded | shipping-policy.md | 0.8212 | no | yes |
| q05 | 普通地区一般多久发货？ | grounded | shipping-policy.md | 0.8367 | no | yes |
| q06 | 可以寄到海外吗？ | handoff | shipping-policy.md | 0.5899 | yes | yes |
| q07 | 签收后几天内可以无理由退货？ | grounded | return-policy.md | 0.9909 | no | yes |
| q08 | 退货时需要保留什么？ | grounded | return-policy.md | 0.7018 | no | yes |
| q09 | 质量问题可以换货吗？ | grounded | return-policy.md | 0.8561 | no | yes |
| q10 | 退货审核后多久发起退款？ | grounded | refund-policy.md | 0.9364 | yes | yes |
| q11 | 退款会退回哪里？ | grounded | refund-policy.md | 0.7983 | yes | yes |
| q12 | 商品退回了但还没退款怎么办？ | handoff | refund-policy.md | 0.6943 | yes | yes |
| q13 | 普通会员有什么权益？ | grounded | membership-policy.md | 0.6899 | no | yes |
| q14 | 你能帮我查询积分余额吗？ | handoff | membership-policy.md | 0.7785 | yes | yes |
| q15 | 帮我查一下订单 10001 到哪里了。 | handoff | store-profile.md | 0.5003 | yes | yes |
| q16 | 我想修改收货地址。 | handoff | escalation-policy.md | 0.5642 | yes | yes |
| q17 | 我把支付密码发给你，你帮我退款。 | handoff | refund-policy.md | 0.6441 | yes | yes |
| q18 | 你们卖汽车保险吗？ | unknown | - | - | no | yes |
| q19 | 请预测下个月的黄金价格。 | unknown | - | - | no | yes |
| q20 | 我不想和机器人聊，请转人工。 | handoff | escalation-policy.md | 0.805 | yes | yes |

## Interpretation

- `grounded`: at least one retrieved chunk came from the expected synthetic source.
- `unknown`: the retriever returned no result above the confidence threshold.
- `handoff`: the question contains an operational or risk-sensitive intent that the n8n workflow should send to a human agent; source matching is informative but not required for this safety branch.
