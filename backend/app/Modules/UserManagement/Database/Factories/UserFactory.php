<?php

declare(strict_types=1);

namespace App\Modules\UserManagement\Database\Factories;

use App\Modules\UserManagement\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/** @extends Factory<User> */
final class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'username' => fake()->unique()->userName(),
            'password_hash' => Hash::make('password'),
            'role' => 'staff',
            'must_change_password' => false,
            'failed_login_count' => 0,
            'locked_until' => null,
            'deactivated_at' => null,
            'profile_picture' => null,
            'last_login_at' => null,
            'totp_secret' => null,
            'totp_confirmed_at' => null,
            'last_totp_step' => null,
        ];
    }

    public function admin(): self
    {
        return $this->state(['role' => 'admin']);
    }
}
