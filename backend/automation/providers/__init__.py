"""Provider registry: picks one adapter per channel from configuration."""

from __future__ import annotations

from automation.config import AutomationConfig
from automation.providers.base import OutboundMessage, Provider, RateLimiter, SendResult, UnconfiguredProvider
from automation.providers.email import MailgunEmailProvider, SmtpEmailProvider
from automation.providers.sandbox import SandboxProvider
from automation.providers.sms import Msg91SmsProvider, TwilioSmsProvider
from automation.providers.whatsapp import BaileysBridgeProvider, MetaCloudWhatsAppProvider

_FACTORIES = {
    "whatsapp": {"meta": MetaCloudWhatsAppProvider, "meta_cloud": MetaCloudWhatsAppProvider,
                 "baileys_bridge": BaileysBridgeProvider},
    "sms": {"twilio": TwilioSmsProvider, "msg91": Msg91SmsProvider},
    "email": {"smtp": SmtpEmailProvider, "mailgun": MailgunEmailProvider},
}


def build_providers(config: AutomationConfig) -> dict[str, Provider]:
    if config.mode == "sandbox":
        return {ch: SandboxProvider(ch) for ch in _FACTORIES}
    selected = {"whatsapp": config.whatsapp_provider, "sms": config.sms_provider, "email": config.email_provider}
    providers: dict[str, Provider] = {}
    for channel, name in selected.items():
        factory = _FACTORIES[channel].get(name)
        if factory is None:
            reason = (f"{channel.upper()}_PROVIDER is not set." if name in ("", "none")
                      else f"Unknown {channel} provider '{name}'.")
            providers[channel] = UnconfiguredProvider(channel, reason)
        else:
            providers[channel] = factory(config)
    return providers


__all__ = ["build_providers", "OutboundMessage", "Provider", "RateLimiter", "SendResult", "SandboxProvider"]
