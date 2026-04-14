<?php
namespace PHPMailer\PHPMailer;

class PHPMailer
{
    public $Host;
    public $SMTPAuth = true;
    public $Username;
    public $Password;
    public $SMTPSecure = 'tls';
    public $Port = 587;
    public $Timeout = 5;
    public $SMTPDebug = 0;
    public $Debugoutput;
    public $MessageID;
    public $Subject = '';
    public $Body = '';
    public $AltBody = '';
    public $ErrorInfo = '';

    private $fromEmail = '';
    private $fromName = '';
    private $to = [];
    private $cc = [];
    private $headers = [];

    public function __construct($exceptions = true) {}

    public function isSMTP(): void {}

    public function setFrom(string $email, string $name = ''): void
    {
        $this->fromEmail = $email;
        $this->fromName = $name;
    }

    public function addAddress(string $email): void
    {
        $this->to[] = $email;
    }

    public function addCC(string $email): void
    {
        $this->cc[] = $email;
    }

    public function addCustomHeader(string $key, string $value): void
    {
        $this->headers[] = $key . ': ' . $value;
    }

    public function isHTML(bool $isHtml = true): void {}

    public function send(): bool
    {
        if (empty($this->to)) {
            $this->ErrorInfo = 'No recipient configured';
            return false;
        }

        $headers = [];
        if ($this->fromEmail !== '') {
            $fromLabel = $this->fromName !== '' ? sprintf('%s <%s>', $this->fromName, $this->fromEmail) : $this->fromEmail;
            $headers[] = 'From: ' . $fromLabel;
        }
        if (!empty($this->cc)) {
            $headers[] = 'Cc: ' . implode(',', $this->cc);
        }
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Content-Type: text/html; charset=UTF-8';
        if (!empty($this->MessageID)) {
            $headers[] = 'Message-ID: ' . $this->MessageID;
        }
        foreach ($this->headers as $header) {
            $headers[] = $header;
        }

        if (is_callable($this->Debugoutput) && $this->SMTPDebug > 0) {
            ($this->Debugoutput)('SMTP fallback mail() transport in use', 2);
        }

        $ok = @mail(implode(',', $this->to), $this->Subject, $this->Body, implode("\r\n", $headers));
        if (!$ok) {
            $this->ErrorInfo = 'mail() transport failed';
        }

        return $ok;
    }
}
