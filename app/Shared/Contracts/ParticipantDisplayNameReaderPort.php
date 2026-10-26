<?php

declare(strict_types=1);

namespace App\Shared\Contracts;

interface ParticipantDisplayNameReaderPort
{
    /**
     * @param  list<string>  $userIds
     * @return array<string, string> user id to public display name
     */
    public function displayNamesFor(array $userIds): array;
}
