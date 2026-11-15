<?php

namespace Tests\Unit;

use App\Support\Search;
use PHPUnit\Framework\TestCase;

class SearchTest extends TestCase
{
    public function test_it_lowercases_and_wraps_the_pattern(): void
    {
        $this->assertSame('%daei%', Search::likePattern('Daei'));
    }

    public function test_it_trims_surrounding_whitespace(): void
    {
        $this->assertSame('%daei%', Search::likePattern('  Daei  '));
    }

    public function test_it_escapes_like_wildcards(): void
    {
        $this->assertSame('%50\%\_off%', Search::likePattern('50%_off'));
    }

    public function test_it_escapes_backslashes(): void
    {
        $this->assertSame('%a\\\\b%', Search::likePattern('a\b'));
    }
}
